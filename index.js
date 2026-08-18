const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID);

if (!TOKEN) {
  console.error('خطا: BOT_TOKEN تنظیم نشده.');
  process.exit(1);
}
if (!OWNER_ID) {
  console.error('خطا: OWNER_ID تنظیم نشده (آیدی عددی خودت تو تلگرام).');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

const DATA_FILE = './groups.json';
function loadGroups() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}
function saveGroups(groups) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2));
}
let groups = loadGroups(); // آرایه‌ای از chatId های ثبت‌شده

const MODS_FILE = './mods.json';
function loadMods() {
  try {
    return JSON.parse(fs.readFileSync(MODS_FILE, 'utf8'));
  } catch {
    return [];
  }
}
function saveMods(mods) {
  fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
}
let mods = loadMods(); // آرایه‌ای از { id, label } برای کاربرانی که اجازه بن/سکوت دارن

function isOwner(msg) {
  return msg.from && msg.from.id === OWNER_ID;
}

// owner همیشه مجازه؛ مدیرهای اضافه‌شده هم فقط برای دستورات بن/سکوت مجازن
function isAuthorized(msg) {
  if (isOwner(msg)) return true;
  return msg.from && mods.some((m) => m.id === msg.from.id);
}

function isGroup(msg) {
  return msg.chat.type === 'group' || msg.chat.type === 'supergroup';
}

// --- ثبت / حذف گپ ---
bot.onText(/^\/register$/, (msg) => {
  if (!isOwner(msg)) return;
  if (!isGroup(msg)) {
    bot.sendMessage(msg.chat.id, 'این دستور فقط داخل یه گروه کار می‌کنه.');
    return;
  }
  const chatId = msg.chat.id;
  if (groups.includes(chatId)) {
    bot.sendMessage(chatId, 'این گروه از قبل ثبت شده ✅');
    return;
  }
  groups.push(chatId);
  saveGroups(groups);
  bot.sendMessage(chatId, `✅ این گروه (${msg.chat.title || chatId}) ثبت شد. الان تعداد گروه‌های تحت کنترل: ${groups.length}`);
});

bot.onText(/^\/unregister$/, (msg) => {
  if (!isOwner(msg)) return;
  const chatId = msg.chat.id;
  groups = groups.filter((g) => g !== chatId);
  saveGroups(groups);
  bot.sendMessage(chatId, '❌ این گروه از لیست حذف شد.');
});

bot.onText(/^\/groups$/, async (msg) => {
  if (!isOwner(msg)) return;
  if (groups.length === 0) {
    bot.sendMessage(msg.chat.id, 'هیچ گروهی ثبت نشده. توی هر گروه /register بزن.');
    return;
  }
  let text = `گروه‌های ثبت‌شده (${groups.length}):\n`;
  for (const g of groups) {
    try {
      const chat = await bot.getChat(g);
      text += `• ${chat.title || g}\n`;
    } catch {
      text += `• ${g} (⚠️ دسترسی ندارم بهش، شاید ربات ازش حذف شده)\n`;
    }
  }
  bot.sendMessage(msg.chat.id, text);
});

// --- مدیریت لیست مدیران (فقط owner) ---
bot.onText(/^\/addmod(?:\s+(\S+))?/, (msg, match) => {
  if (!isOwner(msg)) return;
  const target = getTargetUserId(msg, match);
  if (!target) {
    bot.sendMessage(msg.chat.id, 'روی پیام کاربر ریپلای کن و /addmod بزن، یا /addmod <user_id>.');
    return;
  }
  if (mods.some((m) => m.id === target.id)) {
    bot.sendMessage(msg.chat.id, `${target.label} از قبل تو لیست مدیرهاست.`);
    return;
  }
  mods.push({ id: target.id, label: String(target.label) });
  saveMods(mods);
  bot.sendMessage(msg.chat.id, `✅ ${target.label} به لیست مدیرهایی که می‌تونن بن/سکوت بزنن اضافه شد.`);
});

bot.onText(/^\/removemod(?:\s+(\S+))?/, (msg, match) => {
  if (!isOwner(msg)) return;
  const target = getTargetUserId(msg, match);
  if (!target) {
    bot.sendMessage(msg.chat.id, 'روی پیام کاربر ریپلای کن و /removemod بزن، یا /removemod <user_id>.');
    return;
  }
  const before = mods.length;
  mods = mods.filter((m) => m.id !== target.id);
  saveMods(mods);
  bot.sendMessage(msg.chat.id, before !== mods.length ? `❌ ${target.label} از لیست مدیرها حذف شد.` : 'این فرد تو لیست مدیرها نبود.');
});

bot.onText(/^\/mods$/, (msg) => {
  if (!isOwner(msg)) return;
  if (mods.length === 0) {
    bot.sendMessage(msg.chat.id, 'هیچ مدیری اضافه نشده. فقط خودت (owner) دسترسی داری.');
    return;
  }
  const text = 'مدیرهای مجاز به بن/سکوت:\n' + mods.map((m) => `• ${m.label} (${m.id})`).join('\n');
  bot.sendMessage(msg.chat.id, text);
});

// --- استخراج کاربر هدف از ریپلای یا آرگومان ---
function getTargetUserId(msg, match) {
  if (msg.reply_to_message && msg.reply_to_message.from) {
    return {
      id: msg.reply_to_message.from.id,
      label: msg.reply_to_message.from.first_name || msg.reply_to_message.from.id,
    };
  }
  const arg = match && match[1] && match[1].trim();
  if (arg && /^\d+$/.test(arg)) {
    return { id: Number(arg), label: arg };
  }
  return null;
}

async function applyToAllGroups(action, actionLabel, chatIdOfCommand) {
  if (groups.length === 0) {
    return 'هیچ گروهی ثبت نشده. اول توی گروه‌ها /register بزن.';
  }
  let ok = 0;
  let failed = [];
  for (const g of groups) {
    try {
      await action(g);
      ok++;
    } catch (e) {
      failed.push(`${g}: ${e.message}`);
    }
  }
  let result = `${actionLabel} روی ${ok} از ${groups.length} گروه انجام شد.`;
  if (failed.length) {
    result += `\n⚠️ خطا در:\n${failed.join('\n')}`;
  }
  return result;
}

// --- بن ---
bot.onText(/^\/ban(?:\s+(\S+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;
  const target = getTargetUserId(msg, match);
  if (!target) {
    bot.sendMessage(msg.chat.id, 'روی پیام کاربر ریپلای کن و /ban بزن، یا /ban <user_id>.');
    return;
  }
  const result = await applyToAllGroups(
    (chatId) => bot.banChatMember(chatId, target.id),
    `🚫 بن کاربر ${target.label}`
  );
  bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/unban(?:\s+(\S+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;
  const target = getTargetUserId(msg, match);
  if (!target) {
    bot.sendMessage(msg.chat.id, 'روی پیام کاربر ریپلای کن و /unban بزن، یا /unban <user_id>.');
    return;
  }
  const result = await applyToAllGroups(
    (chatId) => bot.unbanChatMember(chatId, target.id, { only_if_banned: true }),
    `✅ رفع بن کاربر ${target.label}`
  );
  bot.sendMessage(msg.chat.id, result);
});

// --- کیک (حذف بدون بن دائم) ---
bot.onText(/^\/kick(?:\s+(\S+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;
  const target = getTargetUserId(msg, match);
  if (!target) {
    bot.sendMessage(msg.chat.id, 'روی پیام کاربر ریپلای کن و /kick بزن، یا /kick <user_id>.');
    return;
  }
  const result = await applyToAllGroups(async (chatId) => {
    await bot.banChatMember(chatId, target.id);
    await bot.unbanChatMember(chatId, target.id, { only_if_banned: true });
  }, `👢 کیک کاربر ${target.label}`);
  bot.sendMessage(msg.chat.id, result);
});

// --- سکوت / رفع سکوت ---
// استفاده: /mute (ریپلای) [دقیقه]   — اگه دقیقه ندی، سکوت نامحدوده
bot.onText(/^\/mute(?:\s+(\S+))?(?:\s+(\d+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;
  const target = getTargetUserId(msg, match);
  if (!target) {
    bot.sendMessage(msg.chat.id, 'روی پیام کاربر ریپلای کن و /mute [دقیقه] بزن.');
    return;
  }
  const minutes = match && match[2] ? Number(match[2]) : null;
  const untilDate = minutes ? Math.floor(Date.now() / 1000) + minutes * 60 : 0;
  const perms = {
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
  const result = await applyToAllGroups(
    (chatId) => bot.restrictChatMember(chatId, target.id, { permissions: perms, until_date: untilDate }),
    `🔇 سکوت کاربر ${target.label}${minutes ? ` (${minutes} دقیقه)` : ' (نامحدود)'}`
  );
  bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/unmute(?:\s+(\S+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;
  const target = getTargetUserId(msg, match);
  if (!target) {
    bot.sendMessage(msg.chat.id, 'روی پیام کاربر ریپلای کن و /unmute بزن.');
    return;
  }
  const perms = {
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
  const result = await applyToAllGroups(
    (chatId) => bot.restrictChatMember(chatId, target.id, { permissions: perms }),
    `🔊 رفع سکوت کاربر ${target.label}`
  );
  bot.sendMessage(msg.chat.id, result);
});

bot.onText(/^\/start$/, (msg) => {
  if (!isOwner(msg)) return;
  bot.sendMessage(msg.chat.id,
    'سلام! این ربات مدیریت چندگروهیه.\n\n' +
    '۱. منو با ادمین کامل (بن/سکوت) به هر گروهی که میخوای اضافه کن\n' +
    '۲. توی هر گروه یه بار /register بزن\n' +
    '۳. بعد با ریپلای رو پیام کسی، از /ban /kick /mute [دقیقه] /unban /unmute استفاده کن — رو همه گروه‌های ثبت‌شده همزمان اجرا میشه\n\n' +
    '/groups لیست گروه‌های ثبت‌شده رو نشون میده\n' +
    '/addmod (ریپلای) — یه نفرو به لیست کسایی که اجازه بن/سکوت دارن اضافه می‌کنه\n' +
    '/removemod (ریپلای) — از لیست مدیرها حذفش می‌کنه\n' +
    '/mods — لیست مدیرهای فعلی رو نشون میده'
  );
});

bot.on('polling_error', (err) => console.error('Polling error:', err.message));

console.log('ربات مدیریت چندگروهی استارت شد...');
