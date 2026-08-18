// همه‌ی متن‌هایی که ربات به کاربر نشون میده، اینجا جمع شدن تا راحت ادیت بشن.

module.exports = {
  startUnknown: 'درود کاربر گرامی، این ربات خصوصی بوده و تنها با تایید مالک اصلی میتوانید به آن دسترسی پیدا کنید.',
  requestSent: 'کاربر گرامی، درخواست شما وارد صف بررسی شد، لطفا منتظر بمانید.',
  alreadyHaveAccess: 'شما همین الان دسترسی دارید.',
  alreadyPending: 'شما قبلاً یک درخواست ارسال کرده‌اید، لطفاً تا بررسی همون درخواست صبر کنید.',
  startBlocked: 'دسترسی شما توسط مالک ربات مسدود شده و امکان ارسال درخواست جدید ندارید.',

  startFullOwner:
    'سلام! شما مالک اصلی ربات هستید.\n\n' +
    '📌 راهنمای استفاده:\n\n' +
    '1️⃣ ربات را با دسترسی ادمین کامل به هر گروه یا چنلی که می‌خواهید، اضافه کنید.\n\n' +
    '2️⃣ برای ثبت گروه: داخل خود گروه دستور /register را بزنید.\n' +
    'برای ثبت چنل: یک پست از آن چنل را برای ربات فوروارد کنید (ربات باید از قبل ادمین آن چنل باشد).\n\n' +
    '3️⃣ برای بن، آنبن، کیک، میوت یا آنمیوت یک عضو، می‌توانید روی پیامش ریپلای کنید، یا از @یوزرنیم یا آیدی عددی او استفاده کنید — با دستورات /ban /unban /kick /mute /unmute\n\n' +
    '4️⃣ با دستور /addadmin می‌توانید برای گروه/چنل‌های خودتان ادمین انتخاب کنید تا او هم بتواند این دستورات را اجرا کند.\n\n' +
    'از دکمه‌های زیر هم می‌توانید استفاده کنید:',

  startSimpleOwner:
    'درود، درخواست شما به عنوان اونر تایید شد.\n\n' +
    '📌 راهنمای استفاده:\n\n' +
    '1️⃣ ربات را با دسترسی ادمین کامل به هر گروه یا چنلی که می‌خواهید، اضافه کنید.\n\n' +
    '2️⃣ برای ثبت گروه: داخل خود گروه دستور /register را بزنید.\n' +
    'برای ثبت چنل: یک پست از آن چنل را برای ربات فوروارد کنید (ربات باید از قبل ادمین آن چنل باشد).\n\n' +
    '3️⃣ برای بن، آنبن، کیک، میوت یا آنمیوت یک عضو، می‌توانید روی پیامش ریپلای کنید، یا از @یوزرنیم یا آیدی عددی او استفاده کنید — با دستورات /ban /unban /kick /mute /unmute\n\n' +
    '4️⃣ با دستور /addadmin می‌توانید برای گروه/چنل‌های خودتان ادمین انتخاب کنید تا او هم بتواند این دستورات را اجرا کند.\n\n' +
    'دسترسی شما فقط روی گروه/چنل‌های خودتان‌ خواهد بود.',

  startAdmin:
    'درود! شما به عنوان ادمین انتخاب شدید. میتوانید با ریپلای، @یوزرنیم یا آیدی عددی از /ban /kick /mute /unban /unmute استفاده کنید — این دستورات تنها بر روی گروه/چنل‌های اونری که شما را انتخاب کرده است اثر خواهد داشت.',

  requestAccessButton: '🔐 درخواست دسترسی',
  approveButton: '✅ تایید درخواست',
  rejectButton: '❌ رد درخواست',
  blockButton: '🚫 بلاک',
  listOwnersButton: '📋 لیست اونرهای ساده',
  myStatsButton: '📊 آمار من',

  newAccessRequest: ({ name, username, id }) =>
    `درخواست دسترسی جدید :\nیوزر : ${name}\nیوزرنیم : ${username}\nآیدی عددی : ${id}`,

  ownerApprovedForAdmin: (label) => `${label} به لیست اونر های ربات اضافه شد ✅`,
  ownerRejectedForAdmin: 'درخواست رد شد.',
  blockDoneToOwner: (label) => `🚫 ${label} مسدود شد و دیگر نمی‌تواند درخواست دسترسی بدهد.`,
  blockedNotice: 'شما توسط مالک ربات مسدود شدید و دیگر نمی‌توانید درخواست دسترسی ارسال کنید.',
  approvedNoticeForUser: '✅ درخواست دسترسی شما توسط مالک ربات تایید شد، حالا میتوانید /start زده و ربات را به گروه ها و چنل های خود اضافه کنید',
  rejectedNoticeForUser: '❌ درخواست دسترسی شما توسط مالک ربات رد شد.',

  blocklistEmpty: 'هیچ کاربر مسدودی وجود ندارد.',
  blocklistHeader: (count) => `کاربران مسدود (${count}):`,
  unblockButton: (label) => `✅ آنبلاک ${label}`,
  unblockDone: (label) => `✅ ${label} آنبلاک شد و می‌تواند دوباره درخواست دسترسی بدهد.`,
  unblockNotice: 'دسترسی شما توسط مالک ربات آنبلاک شد و می‌توانید دوباره با /start درخواست دسترسی بدهید.',

  notAllowedRegister: 'شما در لیست تایید شده مالک ربات قرار نداشته و دسترسی استفاده از قابلیت های ربات را ندارید.',
  registerOnlyInGroup: 'این دستور تنها مختص به گروه هاست.',
  groupAlreadyRegistered: 'این گروه قبلا ثبت شده است. ✅',
  groupRegistered: (title, groupCount, channelCount) => `✅ گروه (${title}) به لیست شما وصل شد. \nگروه‌های فعال شما : ${groupCount}\nچنل های فعال شما : ${channelCount}`,
  groupUnregistered: (title) => `❌  گروه (${title}) از لیست شما حذف شد.`,

  channelNotAdmin: (title) => `شما ادمین «${title}» نمیباشید و قابلیت اضافه کردن چنل به لیستتان را ندارید.`,
  channelNoAccess: (title) => `ربات نتوانست به «${title}» دسترسی پیدا کند. مطمئن شوید ربات رو به عنوان ادمین به این چنل اضافه کرده و سپس دوباره تلاش کنید.`,
  channelAlreadyRegistered: 'این چنل قبلا ثبت شده است. ✅',
  channelRegistered: (title, channelCount, groupCount) => `✅ چنل «${title}» به لیست شما اضافه شد. \nچنل‌های فعال شما : ${channelCount}\nگروه های فعال شما : ${groupCount}`,

  needTarget: (cmd) => `روی پیام کاربر ریپلای کن، یا ${cmd} @یوزرنیم، یا ${cmd} <آیدی عددی> بزن.`,
  unknownUsername: (u) => `یوزرنیم ${u} رو شناسایی نکردم. ممبر باید حداقل یک بار باید توی یکی از گروه‌های ثبت‌شده پیام داده باشه، در غیر این صورت ریپلای/آیدی عددی رو امتحان کن.`,

  noPlacesRegistered: 'شما هنوز هیچ گروه یا چنلی به لیست خودتان اضافه نکرده‌اید. اول باید یه گروه یا چنل ثبت کنید تا این دستور روی چیزی اجرا بشه.',
  actionResult: (label, ok, total) => `${label} روی ${ok} از ${total} گروه/چنل انجام شد.`,
  actionErrors: (list) => `⚠️ خطا در :\n${list}`,

  banLabel: (who) => `کاربر ${who} بن شد 🚫`,
  unbanLabel: (who) => `کاربر ${who} آنبن شد ✅`,
  kickLabel: (who) => `کاربر ${who} کیک شد`,
  muteLabel: (who, amount, unitLabel) => amount ? `کاربر ${who} برای (${amount} ${unitLabel}) میوت شد 🔇` : `کاربر ${who} میوت شد 🔇`,
  unmuteLabel: (who) => `کاربر ${who} رفع سکوت شد 🔊`,

  addAdminAlready: (who) => `${who} از قبل ادمین شماست.`,
  addAdminDone: (who) => `✅ ${who} به عنوان ادمین اضافه شد و قابلیت هایش در استفاده از ربات افزایش یافت.`,
  addAdminNotice: (ownerLabel) => `شما توسط ${ownerLabel} به عنوان ادمین انتخاب شدید و میتوانید از دستورات ربات در گپ و چنل های لیست شده او استفاده کنید.`,
  removeAdminDone: (who) => `❌ ${who} از لیست ادمین‌های شما حذف شد.`,
  removeAdminNotFound: 'این یوزر جزو ادمین های شما نیست.',
  adminsListEmpty: 'شما هیچ ادمینی اضافه نکردید',
  adminsListHeader: (count) => `ادمین‌های شما (${count}):`,

  ownersListEmpty: 'هنوز هیچ اونر ساده‌ای تایید نشده.',
  ownersListHeader: (count) => `اونرهای تاییدشده ‹ ${count} › :\n`,
  ownerLine: (label, username, id, groups, channels, revoked) =>
    `${revoked ? '🔴' : '🟢'} ${label}${username ? ' (@' + username + ')' : ''}\nآیدی عددی: ${id}\nگروه فعال: ${groups} | چنل فعال: ${channels}${revoked ? '\n(دسترسی لغو شده)' : ''}\n`,

  revokeOwnerButton: (label) => `❌ حذف ${label}`,
  restoreOwnerButton: (label) => `♻️ بازگردانی ${label}`,

  removeOwnerNotFound: 'این فرد اونر ساده تاییدشده نیست.',
  removeOwnerDone: (label) => `❌ دسترسی ${label} به عنوان اونر لغو شد. خودش و ادمین‌هایی که انتخاب کرده بود دیگه نمی‌تونن دستوری بزنن.`,
  removeOwnerNotice: 'دسترسی شما به عنوان اونر این ربات توسط مالک اصلی لغو شد.',
  restoreOwnerDone: (label) => `♻️ دسترسی ${label} به عنوان اونر دوباره برقرار شد.`,
  restoreOwnerNotice: 'دسترسی شما به عنوان اونر این ربات دوباره توسط مالک اصلی برقرار شد ✅',

  myStats: (groupNames, channelNames, admins) => {
    let text = '📊 آمار :\n';
    text += `گپ های فعال : ${groupNames.length}\n`;
    groupNames.forEach((name, i) => { text += `${i + 1}. ${name}\n`; });
    text += `چنل فعال : ${channelNames.length}\n`;
    channelNames.forEach((name, i) => { text += `${i + 1}. ${name}\n`; });
    text += `ادمین‌های شما : ${admins.length}\n`;
    admins.forEach((a) => { text += `${a.label} - ${a.id}\n`; });
    return text;
  },

  fullOwnerCannotSeeAdmins: '', // reserved
};
