const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const MSG = require('./messages');

const TOKEN = process.env.BOT_TOKEN;
const FULL_OWNER_ID = Number(process.env.OWNER_ID);

if (!TOKEN) {
  console.error('خطا: BOT_TOKEN تنظیم نشده.');
  process.exit(1);
}
if (!FULL_OWNER_ID) {
  console.error('خطا: OWNER_ID تنظیم نشده (آیدی عددی مالک اصلی).');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ------------------------------------------------------------------
// ذخیره‌سازی ساده روی فایل JSON
// ------------------------------------------------------------------
const DATA_FILE = './data.json';

function loadData() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      approvedOwners: raw.approvedOwners || {},
      ownerSpaces: raw.ownerSpaces || {},
      adminScope: raw.adminScope || {},
      pendingRequests: raw.pendingRequests || {},
      blockedUsers: raw.blockedUsers || {},
    };
  } catch {
    return { approvedOwners: {}, ownerSpaces: {}, adminScope: {}, pendingRequests: {}, blockedUsers: {} };
  }
}
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

const db = loadData();

function getOwnerSpace(ownerId) {
  const key = String(ownerId);
  if (!db.ownerSpaces[key]) {
    db.ownerSpaces[key] = { groups: [], channels: [], admins: [], usernameCache: {} };
  }
  return db.ownerSpaces[key];
}

// ------------------------------------------------------------------
// سطوح دسترسی
// ------------------------------------------------------------------
function isFullOwner(id) {
  return id === FULL_OWNER_ID;
}
function isApprovedOwner(id) {
  const o = db.approvedOwners[String(id)];
  return !!o && !o.revoked;
}
function isAnyOwner(id) {
  return isFullOwner(id) || isApprovedOwner(id);
}
// اونر مقصدی که دستورات یه کاربر باید رو فضای اون اجرا بشه
function getScopeOwnerFor(id) {
  if (isAnyOwner(id)) return id;
  const ownerId = db.adminScope[String(id)];
  if (!ownerId) return null;
  // اگه اونری که این ادمین بهش وصله دیگه معتبر نیست (حذف شده)، ادمین هم غیرفعاله
  if (!isAnyOwner(ownerId)) return null;
  return ownerId;
}
function canRegisterPlaces(id) {
  return isAnyOwner(id);
}
function canAssignAdmins(id) {
  return isAnyOwner(id);
}
function isBlocked(id) {
  return !!db.blockedUsers[String(id)];
}
function hasPendingRequest(id) {
  return !!db.pendingRequests[String(id)];
}
function isGroupChat(msg) {
  return msg.chat.type === 'group' || msg.chat.type === 'supergroup';
}
function findOwnerOfGroup(chatId) {
  for (const key of Object.keys(db.ownerSpaces)) {
    if (db.ownerSpaces[key].groups.includes(chatId)) return Number(key);
  }
  return null;
}

// ------------------------------------------------------------------
// تشخیص کاربر هدف: ریپلای، @یوزرنیم، یا آیدی عددی
// ------------------------------------------------------------------
function resolveTarget(msg, arg, scopeOwnerId) {
  if (msg.reply_to_message && msg.reply_to_message.from) {
    const u = msg.reply_to_message.from;
    if (u.username) {
      getOwnerSpace(scopeOwnerId).usernameCache[u.username.toLowerCase()] = u.id;
    }
    return { id: u.id, label: u.username ? '@' + u.username : (u.first_name || String(u.id)) };
  }
  if (!arg) return null;
  arg = arg.trim();
  if (/^\d+$/.test(arg)) {
    return { id: Number(arg), label: arg };
  }
  if (arg.startsWith('@')) {
    const uname = arg.slice(1).toLowerCase();
    const id = getOwnerSpace(scopeOwnerId).usernameCache[uname];
    if (id) return { id, label: arg };
    return { id: null, label: arg };
  }
  return null;
}

// ------------------------------------------------------------------
// اعمال یه اکشن روی همه گروه/چنل‌های یه فضا
// ------------------------------------------------------------------
async function applyToScope(ownerId, action, actionLabel, { groupsOnly = false } = {}) {
  const space = getOwnerSpace(ownerId);
  const targets = groupsOnly ? space.groups : [...space.groups, ...space.channels];
  if (targets.length === 0) return MSG.noPlacesRegistered;
  let ok = 0;
  const failed = [];
  for (const chatId of targets) {
    try {
      await action(chatId);
      ok++;
    } catch (e) {
      let name = String(chatId);
      try {
        const chat = await bot.getChat(chatId);
        name = chat.title || name;
      } catch {
        // اگه اسم گروه/چنل هم قابل گرفتن نبود، فقط آیدی رو نشون میدیم
      }
      failed.push(`${chatId} [ ${name} ] : ${e.message}`);
    }
  }
  let result = MSG.actionResult(actionLabel, ok, targets.length);
  if (failed.length) result += '\n' + MSG.actionErrors(failed.join('\n'));
  return result;
}

// ==================================================================
// /start و دکمه‌های اصلی
// ==================================================================
bot.onText(/^\/start$/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  if (isFullOwner(userId)) {
    bot.sendMessage(chatId, MSG.startFullOwner, {
      reply_markup: {
        inline_keyboard: [
          [{ text: MSG.listOwnersButton, callback_data: 'list_owners' }],
          [{ text: MSG.myStatsButton, callback_data: 'my_stats' }],
        ],
      },
    });
    return;
  }
  if (isApprovedOwner(userId)) {
    bot.sendMessage(chatId, MSG.startSimpleOwner, {
      reply_markup: { inline_keyboard: [[{ text: MSG.myStatsButton, callback_data: 'my_stats' }]] },
    });
    return;
  }
  if (db.adminScope[String(userId)]) {
    bot.sendMessage(chatId, MSG.startAdmin);
    return;
  }
  if (isBlocked(userId)) {
    bot.sendMessage(chatId, MSG.startBlocked);
    return;
  }
  bot.sendMessage(chatId, MSG.startUnknown, {
    reply_markup: { inline_keyboard: [[{ text: MSG.requestAccessButton, callback_data: 'request_access' }]] },
  });
});

// ==================================================================
// دکمه‌ها و کال‌بک‌ها
// ==================================================================
bot.on('callback_query', async (query) => {
  const data = query.data || '';
  const fromId = query.from.id;
  const chatId = query.message.chat.id;

  // --- درخواست دسترسی ---
  if (data === 'request_access') {
    if (isAnyOwner(fromId)) {
      bot.answerCallbackQuery(query.id, { text: MSG.alreadyHaveAccess });
      return;
    }
    if (isBlocked(fromId)) {
      bot.answerCallbackQuery(query.id, { text: MSG.startBlocked });
      return;
    }
    if (hasPendingRequest(fromId)) {
      bot.answerCallbackQuery(query.id, { text: MSG.alreadyPending });
      return;
    }
    const u = query.from;
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || String(u.id);
    const username = u.username ? '@' + u.username : 'کاربر دارای آیدی نمیباشد';

    db.pendingRequests[String(u.id)] = true;
    saveData();

    await bot.sendMessage(
      FULL_OWNER_ID,
      MSG.newAccessRequest({ name, username, id: u.id }),
      {
        reply_markup: {
          inline_keyboard: [[
            { text: MSG.approveButton, callback_data: `approve_${u.id}` },
            { text: MSG.rejectButton, callback_data: `reject_${u.id}` },
          ], [
            { text: MSG.blockButton, callback_data: `block_${u.id}` },
          ]],
        },
      }
    );
    bot.answerCallbackQuery(query.id, { text: MSG.requestSent });
    return;
  }

  // --- تایید / رد / بلاک (فقط مالک اصلی) ---
  if (data.startsWith('approve_') || data.startsWith('reject_') || data.startsWith('block_')) {
    if (fromId !== FULL_OWNER_ID) {
      bot.answerCallbackQuery(query.id);
      return;
    }
    const targetId = Number(data.split('_')[1]);
    delete db.pendingRequests[String(targetId)];

    if (data.startsWith('approve_')) {
      let label = String(targetId);
      let username = null;
      try {
        const chat = await bot.getChat(targetId);
        username = chat.username || null;
        label = username ? '@' + username : (chat.first_name || label);
      } catch {
        // اگه نشد اطلاعات بگیریم، همون آیدی رو نگه می‌داریم
      }
      db.approvedOwners[String(targetId)] = { label, username, approvedAt: Date.now() };
      getOwnerSpace(targetId);
      saveData();
      bot.answerCallbackQuery(query.id, { text: MSG.approveButton });
      bot.sendMessage(chatId, MSG.ownerApprovedForAdmin(label));
      bot.sendMessage(targetId, MSG.approvedNoticeForUser).catch(() => {});
    } else if (data.startsWith('reject_')) {
      saveData();
      bot.answerCallbackQuery(query.id, { text: MSG.rejectButton });
      bot.sendMessage(chatId, MSG.ownerRejectedForAdmin);
      bot.sendMessage(targetId, MSG.rejectedNoticeForUser).catch(() => {});
    } else {
      let label = String(targetId);
      let username = null;
      try {
        const chat = await bot.getChat(targetId);
        username = chat.username || null;
        label = username ? '@' + username : (chat.first_name || label);
      } catch {
        // اگه نشد اطلاعات بگیریم، همون آیدی رو نگه می‌داریم
      }
      db.blockedUsers[String(targetId)] = { label, username, blockedAt: Date.now() };
      saveData();
      bot.answerCallbackQuery(query.id, { text: MSG.blockButton });
      bot.sendMessage(chatId, MSG.blockDoneToOwner(label));
      bot.sendMessage(targetId, MSG.blockedNotice).catch(() => {});
    }
    return;
  }

  // --- آنبلاک از طریق دکمه (فقط مالک اصلی) ---
  if (data.startsWith('unblock_')) {
    if (fromId !== FULL_OWNER_ID) {
      bot.answerCallbackQuery(query.id);
      return;
    }
    const targetId = data.slice('unblock_'.length);
    const u = db.blockedUsers[targetId];
    if (!u) {
      bot.answerCallbackQuery(query.id);
      return;
    }
    delete db.blockedUsers[targetId];
    saveData();
    bot.answerCallbackQuery(query.id, { text: MSG.unblockButton(u.label) });
    bot.sendMessage(chatId, MSG.unblockDone(u.label));
    bot.sendMessage(Number(targetId), MSG.unblockNotice).catch(() => {});
    return;
  }

  // --- لیست اونرهای ساده (فقط مالک اصلی) ---
  if (data === 'list_owners') {
    if (fromId !== FULL_OWNER_ID) {
      bot.answerCallbackQuery(query.id);
      return;
    }
    bot.answerCallbackQuery(query.id);
    const ids = Object.keys(db.approvedOwners);
    if (ids.length === 0) {
      bot.sendMessage(chatId, MSG.ownersListEmpty);
      return;
    }
    let text = MSG.ownersListHeader(ids.length);
    const buttons = [];
    for (const id of ids) {
      const o = db.approvedOwners[id];
      const space = getOwnerSpace(Number(id));
      text += '\n' + MSG.ownerLine(o.label, o.username, id, space.groups.length, space.channels.length, o.revoked);
      buttons.push([
        o.revoked
          ? { text: MSG.restoreOwnerButton(o.label), callback_data: `restoreowner_${id}` }
          : { text: MSG.revokeOwnerButton(o.label), callback_data: `revokeowner_${id}` },
      ]);
    }
    bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: buttons } });
    return;
  }

  // --- حذف / بازگردوندن اونر ساده از طریق دکمه (فقط مالک اصلی) ---
  if (data.startsWith('revokeowner_') || data.startsWith('restoreowner_')) {
    if (fromId !== FULL_OWNER_ID) {
      bot.answerCallbackQuery(query.id);
      return;
    }
    const targetId = data.startsWith('revokeowner_') ? data.slice('revokeowner_'.length) : data.slice('restoreowner_'.length);
    const o = db.approvedOwners[targetId];
    if (!o) {
      bot.answerCallbackQuery(query.id);
      return;
    }
    if (data.startsWith('revokeowner_')) {
      o.revoked = true;
      saveData();
      bot.answerCallbackQuery(query.id, { text: MSG.revokeOwnerButton(o.label) });
      bot.sendMessage(chatId, MSG.removeOwnerDone(o.label));
      bot.sendMessage(Number(targetId), MSG.removeOwnerNotice).catch(() => {});
    } else {
      o.revoked = false;
      saveData();
      bot.answerCallbackQuery(query.id, { text: MSG.restoreOwnerButton(o.label) });
      bot.sendMessage(chatId, MSG.restoreOwnerDone(o.label));
      bot.sendMessage(Number(targetId), MSG.restoreOwnerNotice).catch(() => {});
    }
    return;
  }

  // --- آمار من (هر اونری، ساده یا کامل) ---
  if (data === 'my_stats') {
    bot.answerCallbackQuery(query.id);
    if (!isAnyOwner(fromId)) return;
    const space = getOwnerSpace(fromId);
    const groupNames = [];
    for (const id of space.groups) {
      try {
        const chat = await bot.getChat(id);
        groupNames.push(chat.title || String(id));
      } catch {
        groupNames.push(String(id));
      }
    }
    const channelNames = [];
    for (const id of space.channels) {
      try {
        const chat = await bot.getChat(id);
        channelNames.push(chat.title || String(id));
      } catch {
        channelNames.push(String(id));
      }
    }
    bot.sendMessage(chatId, MSG.myStats(groupNames, channelNames, space.admins));
    return;
  }
});

// ==================================================================
// ثبت گروه
// ==================================================================
bot.onText(/^\/register$/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (!isGroupChat(msg)) {
    bot.sendMessage(chatId, MSG.registerOnlyInGroup);
    return;
  }
  if (!canRegisterPlaces(userId)) {
    bot.sendMessage(chatId, MSG.notAllowedRegister);
    return;
  }
  const space = getOwnerSpace(userId);
  if (space.groups.includes(chatId)) {
    bot.sendMessage(chatId, MSG.groupAlreadyRegistered);
    return;
  }
  space.groups.push(chatId);
  saveData();
  bot.sendMessage(chatId, MSG.groupRegistered(msg.chat.title || chatId, space.groups.length, space.channels.length));
});

bot.onText(/^\/unregister$/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (!isGroupChat(msg)) {
    bot.sendMessage(chatId, MSG.registerOnlyInGroup);
    return;
  }
  if (!canRegisterPlaces(userId)) return;
  const space = getOwnerSpace(userId);
  space.groups = space.groups.filter((g) => g !== chatId);
  saveData();
  bot.sendMessage(chatId, MSG.groupUnregistered(msg.chat.title || chatId));
});

// ==================================================================
// ثبت چنل — با فوروارد کردن یه پست از چنل، توی چت خصوصی با ربات
// ==================================================================
bot.on('message', async (msg) => {
  if (msg.chat.type !== 'private') return;
  if (!msg.forward_from_chat || msg.forward_from_chat.type !== 'channel') return;

  const userId = msg.from.id;
  const channelId = msg.forward_from_chat.id;
  const channelTitle = msg.forward_from_chat.title || String(channelId);

  if (!canRegisterPlaces(userId)) {
    bot.sendMessage(msg.chat.id, MSG.notAllowedRegister);
    return;
  }

  try {
    const member = await bot.getChatMember(channelId, userId);
    if (!['administrator', 'creator'].includes(member.status)) {
      bot.sendMessage(msg.chat.id, MSG.channelNotAdmin(channelTitle));
      return;
    }
  } catch {
    bot.sendMessage(msg.chat.id, MSG.channelNoAccess(channelTitle));
    return;
  }

  const space = getOwnerSpace(userId);
  if (space.channels.includes(channelId)) {
    bot.sendMessage(msg.chat.id, MSG.channelAlreadyRegistered);
    return;
  }
  space.channels.push(channelId);
  saveData();
  bot.sendMessage(msg.chat.id, MSG.channelRegistered(channelTitle, space.channels.length, space.groups.length));
});

// ------------------------------------------------------------------
// یادگیری خودکار یوزرنیم‌ها از پیام‌های گروه‌های ثبت‌شده
// (لازم برای اینکه بعداً بشه با @یوزرنیم هدف رو پیدا کرد)
// ------------------------------------------------------------------
bot.on('message', (msg) => {
  if (!msg.from || !msg.from.username) return;
  if (!isGroupChat(msg)) return;
  const ownerId = findOwnerOfGroup(msg.chat.id);
  if (!ownerId) return;
  const space = getOwnerSpace(ownerId);
  const uname = msg.from.username.toLowerCase();
  if (space.usernameCache[uname] !== msg.from.id) {
    space.usernameCache[uname] = msg.from.id;
    saveData();
  }
});

// ==================================================================
// لیست بلاک‌شده‌ها و آنبلاک (فقط مالک اصلی — دستور مخفی، جزو دکمه‌های اصلی نیست)
// ==================================================================
bot.onText(/^\/blocklist$/, (msg) => {
  if (msg.from.id !== FULL_OWNER_ID) return;
  const ids = Object.keys(db.blockedUsers);
  if (ids.length === 0) {
    bot.sendMessage(msg.chat.id, MSG.blocklistEmpty);
    return;
  }
  const buttons = ids.map((id) => [{ text: MSG.unblockButton(db.blockedUsers[id].label), callback_data: `unblock_${id}` }]);
  bot.sendMessage(msg.chat.id, MSG.blocklistHeader(ids.length), { reply_markup: { inline_keyboard: buttons } });
});

// ==================================================================
// حذف اونر ساده (فقط مالک اصلی) — خودش و ادمین‌هاش غیرفعال میشن
// ==================================================================
bot.onText(/^\/removeowner(?:\s+(\S+))?$/, (msg, match) => {
  const userId = msg.from.id;
  if (userId !== FULL_OWNER_ID) return;
  const target = resolveTarget(msg, match[1], FULL_OWNER_ID);
  if (!target || !target.id) {
    bot.sendMessage(msg.chat.id, MSG.needTarget('/removeowner'));
    return;
  }
  if (!isApprovedOwner(target.id)) {
    bot.sendMessage(msg.chat.id, MSG.removeOwnerNotFound);
    return;
  }
  const label = db.approvedOwners[String(target.id)].label;
  db.approvedOwners[String(target.id)].revoked = true;
  saveData();
  bot.sendMessage(msg.chat.id, MSG.removeOwnerDone(label));
  bot.sendMessage(target.id, MSG.removeOwnerNotice).catch(() => {});
});

// ==================================================================
// مدیریت ادمین‌ها (فقط توسط اونر کامل یا اونر ساده، برای فضای خودشون)
// ==================================================================
bot.onText(/^\/addadmin(?:\s+(\S+))?$/, (msg, match) => {
  const userId = msg.from.id;
  if (!canAssignAdmins(userId)) return;
  const target = resolveTarget(msg, match[1], userId);
  if (!target) {
    bot.sendMessage(msg.chat.id, MSG.needTarget('/addadmin'));
    return;
  }
  if (!target.id) {
    bot.sendMessage(msg.chat.id, MSG.unknownUsername(target.label));
    return;
  }
  const space = getOwnerSpace(userId);
  if (space.admins.some((a) => a.id === target.id)) {
    bot.sendMessage(msg.chat.id, MSG.addAdminAlready(target.label));
    return;
  }
  space.admins.push({ id: target.id, label: target.label });
  db.adminScope[String(target.id)] = userId;
  saveData();
  bot.sendMessage(msg.chat.id, MSG.addAdminDone(target.label));
  const ownerLabel = msg.from.username ? '@' + msg.from.username : (msg.from.first_name || String(userId));
  bot.sendMessage(target.id, MSG.addAdminNotice(ownerLabel)).catch(() => {});
});

bot.onText(/^\/removeadmin(?:\s+(\S+))?$/, (msg, match) => {
  const userId = msg.from.id;
  if (!canAssignAdmins(userId)) return;
  const target = resolveTarget(msg, match[1], userId);
  if (!target || !target.id) {
    bot.sendMessage(msg.chat.id, MSG.needTarget('/removeadmin'));
    return;
  }
  const space = getOwnerSpace(userId);
  const before = space.admins.length;
  space.admins = space.admins.filter((a) => a.id !== target.id);
  if (db.adminScope[String(target.id)] === userId) {
    delete db.adminScope[String(target.id)];
  }
  saveData();
  bot.sendMessage(msg.chat.id, before !== space.admins.length ? MSG.removeAdminDone(target.label) : MSG.removeAdminNotFound);
});

bot.onText(/^\/admins$/, (msg) => {
  const userId = msg.from.id;
  if (!isAnyOwner(userId)) return;
  const space = getOwnerSpace(userId);
  if (space.admins.length === 0) {
    bot.sendMessage(msg.chat.id, MSG.adminsListEmpty);
    return;
  }
  const text = MSG.adminsListHeader(space.admins.length) + '\n' + space.admins.map((a) => `• ${a.label} (${a.id})`).join('\n');
  bot.sendMessage(msg.chat.id, text);
});

// ==================================================================
// دستورات مدیریتی: بن / آنبن / کیک / میوت / آنمیوت
// ==================================================================
function registerModCommand(cmdName, { groupsOnly, buildAction, label }) {
  const pattern = new RegExp(`^\\/${cmdName}(?:\\s+(.*))?$`);
  bot.onText(pattern, async (msg, match) => {
    const userId = msg.from.id;
    const scopeOwner = getScopeOwnerFor(userId);
    if (!scopeOwner) return;

    const rawArgs = (match[1] || '').trim().split(/\s+/).filter(Boolean);
    const replying = !!(msg.reply_to_message && msg.reply_to_message.from);
    // اگه ریپلای شده، همه‌ی آرگومان‌ها مال پارامتر اضافه‌ان (مثلاً مدت زمان میوت)
    // اگه ریپلای نشده، آرگومان اول هدف (یوزرنیم/آیدی) و بقیه پارامتر اضافه‌ان
    const targetArg = replying ? null : rawArgs[0];
    const extraArg = replying ? rawArgs[0] : rawArgs[1];

    const target = resolveTarget(msg, targetArg, scopeOwner);
    if (!target) {
      bot.sendMessage(msg.chat.id, MSG.needTarget('/' + cmdName));
      return;
    }
    if (!target.id) {
      bot.sendMessage(msg.chat.id, MSG.unknownUsername(target.label));
      return;
    }

    const result = await applyToScope(
      scopeOwner,
      (chatId) => buildAction(chatId, target.id, extraArg),
      label(target.label, extraArg),
      { groupsOnly }
    );
    bot.sendMessage(msg.chat.id, result);
  });
}

registerModCommand('ban', {
  groupsOnly: false,
  buildAction: (chatId, userId) => bot.banChatMember(chatId, userId),
  label: (who) => MSG.banLabel(who),
});

registerModCommand('unban', {
  groupsOnly: false,
  buildAction: (chatId, userId) => bot.unbanChatMember(chatId, userId, { only_if_banned: true }),
  label: (who) => MSG.unbanLabel(who),
});

registerModCommand('kick', {
  groupsOnly: false,
  buildAction: async (chatId, userId) => {
    await bot.banChatMember(chatId, userId);
    await bot.unbanChatMember(chatId, userId, { only_if_banned: true });
  },
  label: (who) => MSG.kickLabel(who),
});

const MUTE_PERMS_OFF = {
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
};
const MUTE_PERMS_ON = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_photos: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
};

// تشخیص واحد زمان: m=دقیقه, h=ساعت, d=روز, mo=ماه. بدون واحد = دقیقه.
const DURATION_UNIT_LABELS = { m: 'دقیقه', h: 'ساعت', d: 'روز', mo: 'ماه' };
const DURATION_UNIT_MINUTES = { m: 1, h: 60, d: 60 * 24, mo: 60 * 24 * 30 };
function parseDuration(str) {
  if (!str) return null;
  const m = String(str).match(/^(\d+)(mo|m|h|d)?$/i);
  if (!m) return null;
  const amount = Number(m[1]);
  if (amount <= 0) return null;
  const unit = (m[2] || 'm').toLowerCase();
  return { minutes: amount * DURATION_UNIT_MINUTES[unit], amount, unitLabel: DURATION_UNIT_LABELS[unit] };
}

registerModCommand('mute', {
  groupsOnly: true,
  buildAction: (chatId, userId, durationStr) => {
    const d = parseDuration(durationStr);
    const untilDate = d ? Math.floor(Date.now() / 1000) + d.minutes * 60 : 0; // d.minutes → ثانیه
    return bot.restrictChatMember(chatId, userId, { permissions: MUTE_PERMS_OFF, until_date: untilDate });
  },
  label: (who, durationStr) => {
    const d = parseDuration(durationStr);
    return MSG.muteLabel(who, d ? d.amount : null, d ? d.unitLabel : null);
  },
});

registerModCommand('unmute', {
  groupsOnly: true,
  buildAction: (chatId, userId) => bot.restrictChatMember(chatId, userId, { permissions: MUTE_PERMS_ON }),
  label: (who) => MSG.unmuteLabel(who),
});

// ==================================================================
bot.on('polling_error', (err) => console.error('Polling error:', err.message));

console.log('ربات مدیریت چندفضایی استارت شد...');
