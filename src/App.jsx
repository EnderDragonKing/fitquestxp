import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc, getDocs, collection } from "firebase/firestore";

// ── Constants ─────────────────────────────────────────────────────────────────
const RANKS = [
  { name:"Recruit",      minXP:0,      maxXP:499,    color:"#8B7355", bg:"#2a1f0e", icon:"🪨", glow:"#8B7355" },
  { name:"Bronze",       minXP:500,    maxXP:999,    color:"#CD7F32", bg:"#2a1500", icon:"🥉", glow:"#CD7F32" },
  { name:"Silver",       minXP:1000,    maxXP:1499,   color:"#C0C0C0", bg:"#1a1a2e", icon:"🥈", glow:"#C0C0C0" },
  { name:"Gold",         minXP:1500,   maxXP:3499,   color:"#FFD700", bg:"#1a1400", icon:"🥇", glow:"#FFD700" },
  { name:"Platinum",     minXP:3500,   maxXP:6999,   color:"#00CFCF", bg:"#001a1a", icon:"💎", glow:"#00CFCF" },
  { name:"Diamond",      minXP:7000,   maxXP:14999,  color:"#66CCFF", bg:"#001020", icon:"💠", glow:"#66CCFF" },
  { name:"Legendary",    minXP:15000,  maxXP:29999,  color:"#FF6B35", bg:"#1a0800", icon:"🔥", glow:"#FF6B35" },
  { name:"Mythic",       minXP:30000,  maxXP:54999,  color:"#CC44FF", bg:"#1a0028", icon:"🌀", glow:"#CC44FF" },
  { name:"Immortal",     minXP:55000,  maxXP:89999,  color:"#FF3366", bg:"#200010", icon:"⚡", glow:"#FF3366" },
  { name:"Celestial",    minXP:90000,  maxXP:139999, color:"#AADDFF", bg:"#00101a", icon:"🌌", glow:"#AADDFF" },
  { name:"Cosmic",       minXP:140000, maxXP:209999, color:"#FF99FF", bg:"#1a0020", icon:"🪐", glow:"#FF99FF" },
  { name:"Divine",       minXP:210000, maxXP:299999, color:"#FFEE88", bg:"#1a1600", icon:"✨", glow:"#FFEE88" },
  { name:"Eternal",      minXP:300000, maxXP:499999, color:"#44FFCC", bg:"#001a12", icon:"♾️", glow:"#44FFCC" },
  { name:"Transcendent", minXP:500000, maxXP:Infinity, color:"#FFFFFF", bg:"#0a0a14", icon:"👁️", glow:"#FFFFFF" },
];

const AVATARS = ["💀","⚔️","🛡️","🏹","🧙","🦸","🥷","🧝","🐉","🦁","🐯","🦊","🦅","🌟","⚡","🔥","💎","🌙","🌊","🍀","🎯","💪","🧠","🚀","🎮","👑","🎭","🏆","🌈","🦄","🎸"];

const DEFAULT_HABITS = [
  { id:1, name:"10 Push-ups",       category:"Strength", xp:30, icon:"💪", completedToday:false, timeOfDay:"morning" },
  { id:2, name:"20 Min Walk",        category:"Cardio",   xp:40, icon:"🚶", completedToday:false, timeOfDay:"morning" },
  { id:3, name:"Drink 8 Glasses",   category:"Wellness", xp:20, icon:"💧", completedToday:false, timeOfDay:"afternoon" },
  { id:4, name:"10 Min Meditation", category:"Mind",     xp:25, icon:"🧘", completedToday:false, timeOfDay:"morning" },
  { id:5, name:"30 Min Reading",    category:"Mind",     xp:35, icon:"📚", completedToday:false, timeOfDay:"night" },
  { id:6, name:"15 Squats",         category:"Strength", xp:30, icon:"🏋️", completedToday:false, timeOfDay:"afternoon" },
];

const CATEGORY_COLORS = { Strength:"#FF6B35", Cardio:"#00CFCF", Wellness:"#4CAF50", Mind:"#9B59B6", Custom:"#FFD700" };

const ACHIEVEMENTS = [
  { id:"first_login",  name:"Welcome Hero",    desc:"Log in for the first time",      icon:"🎖️", xpReward:50   },
  { id:"streak_3",     name:"On Fire",          desc:"Reach a 3-day streak",            icon:"🔥", xpReward:100  },
  { id:"streak_7",     name:"Week Warrior",     desc:"Reach a 7-day streak",            icon:"⚔️", xpReward:250  },
  { id:"streak_30",    name:"Iron Will",        desc:"Reach a 30-day streak",           icon:"🦾", xpReward:1000 },
  { id:"habits_10",    name:"Getting Started",  desc:"Complete 10 habits total",        icon:"✅", xpReward:100  },
  { id:"habits_50",    name:"Habit Machine",    desc:"Complete 50 habits total",        icon:"⚙️", xpReward:300  },
  { id:"habits_100",   name:"Century Club",     desc:"Complete 100 habits total",       icon:"💯", xpReward:500  },
  { id:"perfect_day",  name:"Perfect Day",      desc:"Complete all habits in a day",    icon:"⭐", xpReward:100  },
  { id:"rank_bronze",  name:"Bronze Warrior",   desc:"Reach Bronze rank",               icon:"🥉", xpReward:0    },
  { id:"rank_silver",  name:"Silver Knight",    desc:"Reach Silver rank",               icon:"🥈", xpReward:0    },
  { id:"rank_gold",    name:"Golden Champion",  desc:"Reach Gold rank",                 icon:"🥇", xpReward:0    },
  { id:"rank_plat",         name:"Platinum Elite",    desc:"Reach Platinum rank",         icon:"💎", xpReward:0 },
  { id:"rank_diamond",      name:"Diamond Lord",      desc:"Reach Diamond rank",          icon:"💠", xpReward:0 },
  { id:"rank_legendary",    name:"Legendary Hero",    desc:"Reach Legendary rank",        icon:"🔥", xpReward:0 },
  { id:"rank_mythic",       name:"Mythic Being",      desc:"Reach Mythic rank",           icon:"🌀", xpReward:0 },
  { id:"rank_immortal",     name:"Immortal",          desc:"Reach Immortal rank",         icon:"⚡", xpReward:0 },
  { id:"rank_celestial",    name:"Celestial",         desc:"Reach Celestial rank",        icon:"🌌", xpReward:0 },
  { id:"rank_cosmic",       name:"Cosmic",            desc:"Reach Cosmic rank",           icon:"🪐", xpReward:0 },
  { id:"rank_divine",       name:"Divine",            desc:"Reach Divine rank",           icon:"✨", xpReward:0 },
  { id:"rank_eternal",      name:"Eternal",           desc:"Reach Eternal rank",          icon:"♾️", xpReward:0 },
  { id:"rank_transcendent", name:"Transcendent",      desc:"Reach Transcendent rank",     icon:"👁️", xpReward:0 },
  { id:"xp_1000",      name:"Power Surge",      desc:"Earn 1,000 total XP",             icon:"⚡", xpReward:0    },
  { id:"xp_5000",      name:"Legend Rising",    desc:"Earn 5,000 total XP",             icon:"🌠", xpReward:0    },
  { id:"missions_5",   name:"Mission Ace",      desc:"Complete 5 daily missions",       icon:"🎯", xpReward:150  },
  { id:"loot_3",       name:"Loot Hoarder",     desc:"Open 3 loot boxes",               icon:"📦", xpReward:100  },
];

const MISSIONS_POOL = [
  { id:"m_all",  name:"Full Send",     desc:"Complete ALL habits today",          icon:"💥", xp:100, check:(h)=>h.length>0&&h.every(x=>x.completedToday) },
  { id:"m_3",    name:"Triple Threat", desc:"Complete 3 habits today",            icon:"🎯", xp:60,  check:(h)=>h.filter(x=>x.completedToday).length>=3 },
  { id:"m_2",    name:"Early Bird",    desc:"Complete 2 habits today",            icon:"🌅", xp:40,  check:(h)=>h.filter(x=>x.completedToday).length>=2 },
  { id:"m_str",  name:"Strength Day",  desc:"Complete all Strength habits",       icon:"💪", xp:60,  check:(h)=>h.filter(x=>x.category==="Strength").length>0&&h.filter(x=>x.category==="Strength").every(x=>x.completedToday) },
  { id:"m_mind", name:"Mindful",       desc:"Complete all Mind habits",           icon:"🧘", xp:60,  check:(h)=>h.filter(x=>x.category==="Mind").length>0&&h.filter(x=>x.category==="Mind").every(x=>x.completedToday) },
  { id:"m_well", name:"Wellness",      desc:"Complete all Wellness habits",       icon:"🌿", xp:60,  check:(h)=>h.filter(x=>x.category==="Wellness").length>0&&h.filter(x=>x.category==="Wellness").every(x=>x.completedToday) },
  { id:"m_card", name:"Cardio King",   desc:"Complete all Cardio habits",         icon:"🏃", xp:60,  check:(h)=>h.filter(x=>x.category==="Cardio").length>0&&h.filter(x=>x.category==="Cardio").every(x=>x.completedToday) },
  { id:"m_half", name:"Half Way",      desc:"Complete at least half your habits", icon:"🏅", xp:40,  check:(h)=>h.length>0&&h.filter(x=>x.completedToday).length>=Math.ceil(h.length/2) },
  { id:"m_5",    name:"Five High",     desc:"Complete 5 habits today",            icon:"✋", xp:80,  check:(h)=>h.filter(x=>x.completedToday).length>=5 },
  { id:"m_4",    name:"Four Strong",   desc:"Complete 4 habits today",            icon:"4️⃣", xp:70,  check:(h)=>h.filter(x=>x.completedToday).length>=4 },
];

const LOOT_REWARDS = [
  { type:"xp", amount:50,  label:"+50 Bonus XP!",  icon:"⚡", color:"#FFD700" },
  { type:"xp", amount:100, label:"+100 Bonus XP!", icon:"💫", color:"#FFD700" },
  { type:"xp", amount:150, label:"+150 Bonus XP!", icon:"🌟", color:"#FF6B35" },
  { type:"xp", amount:200, label:"+200 Bonus XP!", icon:"✨", color:"#FF6B35" },
  { type:"xp", amount:75,  label:"+75 Bonus XP!",  icon:"⚡", color:"#FFD700" },
];

const XP_EVENTS = [
  { id:"weekend", label:"Weekend Bonus", icon:"🌟", mult:1.5, color:"#FF6B35",
    active:()=>{ const d=new Date().getDay(); return d===0||d===6; } },
  { id:"monday",  label:"Monday Motivation", icon:"💪", mult:1.25, color:"#4CAF50",
    active:()=>new Date().getDay()===1 },
];

const LANGUAGES = [
  { code:"en", flag:"🇬🇧", name:"English",       t:{ title:"Daily Habit Tracker", emailLabel:"Your Email",       emailPlaceholder:"hero@example.com",    continue:"Continue →",    checking:"Checking...",    tagline:"Enter your email to save and sync progress.", tagline2:"Use the same email on any device to restore your data.", chooseTitle:"Choose Your Name", chooseSubtitle:"This is how other players will see you.", usernameLabel:"Username", usernamePlaceholder:"HeroWarrior99", usernameHint:"Letters, numbers and underscores only · 3–20 chars", createBtn:"Create My Account →", back:"← Back",   langLabel:"Language" }},
  { code:"pt", flag:"🇵🇹", name:"Português",      t:{ title:"Rastreador de Hábitos", emailLabel:"O Teu Email",    emailPlaceholder:"heroi@exemplo.com",    continue:"Continuar →",   checking:"A verificar...", tagline:"Insere o teu email para guardar o progresso.", tagline2:"Usa o mesmo email em qualquer dispositivo.", chooseTitle:"Escolhe o Teu Nome", chooseSubtitle:"É assim que os outros jogadores te vão ver.", usernameLabel:"Nome de Utilizador", usernamePlaceholder:"HeroiGuerreira99", usernameHint:"Letras, números e underscores · 3–20 carateres", createBtn:"Criar a Minha Conta →", back:"← Voltar", langLabel:"Idioma" }},
  { code:"es", flag:"🇪🇸", name:"Español",         t:{ title:"Rastreador de Hábitos", emailLabel:"Tu Correo",      emailPlaceholder:"heroe@ejemplo.com",    continue:"Continuar →",   checking:"Verificando...", tagline:"Introduce tu correo para guardar el progreso.", tagline2:"Usa el mismo correo en cualquier dispositivo.", chooseTitle:"Elige Tu Nombre", chooseSubtitle:"Así es como te verán los otros jugadores.", usernameLabel:"Nombre de Usuario", usernamePlaceholder:"HeroeGuerrero99", usernameHint:"Letras, números y guiones bajos · 3–20 caracteres", createBtn:"Crear Mi Cuenta →", back:"← Volver", langLabel:"Idioma" }},
  { code:"fr", flag:"🇫🇷", name:"Français",        t:{ title:"Suivi d'Habitudes",    emailLabel:"Votre Email",    emailPlaceholder:"heros@exemple.com",    continue:"Continuer →",   checking:"Vérification...",tagline:"Entrez votre email pour sauvegarder la progression.", tagline2:"Utilisez le même email sur n'importe quel appareil.", chooseTitle:"Choisissez Votre Nom", chooseSubtitle:"C'est comme ça que les autres joueurs vous verront.", usernameLabel:"Nom d'Utilisateur", usernamePlaceholder:"HeroGuerriere99", usernameHint:"Lettres, chiffres et tirets bas · 3–20 caractères", createBtn:"Créer Mon Compte →", back:"← Retour", langLabel:"Langue" }},
  { code:"de", flag:"🇩🇪", name:"Deutsch",          t:{ title:"Gewohnheits-Tracker",  emailLabel:"Deine E-Mail",   emailPlaceholder:"held@beispiel.com",    continue:"Weiter →",      checking:"Prüfen...",      tagline:"Gib deine E-Mail ein, um deinen Fortschritt zu speichern.", tagline2:"Verwende dieselbe E-Mail auf jedem Gerät.", chooseTitle:"Wähle Deinen Namen", chooseSubtitle:"So werden dich andere Spieler sehen.", usernameLabel:"Benutzername", usernamePlaceholder:"HeldKrieger99", usernameHint:"Buchstaben, Zahlen und Unterstriche · 3–20 Zeichen", createBtn:"Konto Erstellen →", back:"← Zurück", langLabel:"Sprache" }},
  { code:"it", flag:"🇮🇹", name:"Italiano",         t:{ title:"Tracker di Abitudini", emailLabel:"La Tua Email",   emailPlaceholder:"eroe@esempio.com",     continue:"Continua →",    checking:"Controllo...",   tagline:"Inserisci la tua email per salvare i progressi.", tagline2:"Usa la stessa email su qualsiasi dispositivo.", chooseTitle:"Scegli il Tuo Nome", chooseSubtitle:"È così che gli altri giocatori ti vedranno.", usernameLabel:"Nome Utente", usernamePlaceholder:"EroeGuerriero99", usernameHint:"Lettere, numeri e trattini bassi · 3–20 caratteri", createBtn:"Crea il Mio Account →", back:"← Indietro", langLabel:"Lingua" }},
  { code:"br", flag:"🇧🇷", name:"Português (BR)",   t:{ title:"Rastreador de Hábitos", emailLabel:"Seu Email",      emailPlaceholder:"heroi@exemplo.com",    continue:"Continuar →",   checking:"Verificando...", tagline:"Digite seu email para salvar o progresso.", tagline2:"Use o mesmo email em qualquer dispositivo.", chooseTitle:"Escolha Seu Nome", chooseSubtitle:"É assim que outros jogadores vão te ver.", usernameLabel:"Nome de Usuário", usernamePlaceholder:"HeroiGuerreiro99", usernameHint:"Letras, números e underscores · 3–20 caracteres", createBtn:"Criar Minha Conta →", back:"← Voltar", langLabel:"Idioma" }},
  { code:"ja", flag:"🇯🇵", name:"日本語",             t:{ title:"習慣トラッカー",        emailLabel:"メールアドレス",  emailPlaceholder:"hero@example.com",    continue:"次へ →",        checking:"確認中...",      tagline:"メールを入力して進捗を保存しましょう。", tagline2:"同じメールでどのデバイスでも復元できます。", chooseTitle:"名前を選んでください", chooseSubtitle:"他のプレイヤーにはこの名前が表示されます。", usernameLabel:"ユーザー名", usernamePlaceholder:"HeroWarrior99", usernameHint:"英数字とアンダースコアのみ · 3〜20文字", createBtn:"アカウントを作成 →", back:"← 戻る", langLabel:"言語" }},
  { code:"zh", flag:"🇨🇳", name:"中文",              t:{ title:"习惯追踪器",            emailLabel:"您的邮箱",       emailPlaceholder:"hero@example.com",    continue:"继续 →",        checking:"检查中...",      tagline:"输入邮箱以保存进度。", tagline2:"在任何设备上使用相同的邮箱即可恢复数据。", chooseTitle:"选择您的名字", chooseSubtitle:"其他玩家将看到这个名字。", usernameLabel:"用户名", usernamePlaceholder:"HeroWarrior99", usernameHint:"仅限字母、数字和下划线 · 3–20个字符", createBtn:"创建我的账户 →", back:"← 返回", langLabel:"语言" }},
  { code:"ko", flag:"🇰🇷", name:"한국어",             t:{ title:"습관 트래커",           emailLabel:"이메일",         emailPlaceholder:"hero@example.com",    continue:"계속 →",        checking:"확인 중...",     tagline:"이메일을 입력하여 진행 상황을 저장하세요.", tagline2:"어떤 기기에서도 같은 이메일로 복원할 수 있습니다.", chooseTitle:"이름을 선택하세요", chooseSubtitle:"다른 플레이어들이 이 이름을 보게 됩니다.", usernameLabel:"사용자 이름", usernamePlaceholder:"HeroWarrior99", usernameHint:"영문자, 숫자, 밑줄만 가능 · 3–20자", createBtn:"계정 만들기 →", back:"← 뒤로", langLabel:"언어" }},
  { code:"ru", flag:"🇷🇺", name:"Русский",           t:{ title:"Трекер Привычек",      emailLabel:"Ваш Email",      emailPlaceholder:"hero@example.com",    continue:"Продолжить →", checking:"Проверка...",    tagline:"Введите email, чтобы сохранить прогресс.", tagline2:"Используйте тот же email на любом устройстве.", chooseTitle:"Выберите Имя", chooseSubtitle:"Так вас будут видеть другие игроки.", usernameLabel:"Имя пользователя", usernamePlaceholder:"HeroWarrior99", usernameHint:"Только буквы, цифры и подчёркивания · 3–20 символов", createBtn:"Создать Аккаунт →", back:"← Назад", langLabel:"Язык" }},
  { code:"nl", flag:"🇳🇱", name:"Nederlands",        t:{ title:"Gewoonten Tracker",    emailLabel:"Jouw Email",     emailPlaceholder:"held@voorbeeld.com",  continue:"Doorgaan →",    checking:"Controleren...", tagline:"Voer je email in om voortgang op te slaan.", tagline2:"Gebruik hetzelfde email op elk apparaat.", chooseTitle:"Kies Je Naam", chooseSubtitle:"Zo zien andere spelers jou.", usernameLabel:"Gebruikersnaam", usernamePlaceholder:"HeldKrieger99", usernameHint:"Letters, cijfers en underscores · 3–20 tekens", createBtn:"Account Aanmaken →", back:"← Terug", langLabel:"Taal" }},
  { code:"tr", flag:"🇹🇷", name:"Türkçe",            t:{ title:"Alışkanlık Takibi",    emailLabel:"E-postanız",     emailPlaceholder:"kahraman@ornek.com",  continue:"Devam Et →",    checking:"Kontrol ediliyor...", tagline:"İlerlemenizi kaydetmek için e-posta girin.", tagline2:"Herhangi bir cihazda aynı e-postayı kullanın.", chooseTitle:"Adınızı Seçin", chooseSubtitle:"Diğer oyuncular sizi bu isimle görecek.", usernameLabel:"Kullanıcı Adı", usernamePlaceholder:"KahramanSavascı99", usernameHint:"Harf, rakam ve alt çizgi · 3–20 karakter", createBtn:"Hesabımı Oluştur →", back:"← Geri", langLabel:"Dil" }},
  { code:"ar", flag:"🇸🇦", name:"العربية",           t:{ title:"متتبع العادات",         emailLabel:"بريدك الإلكتروني", emailPlaceholder:"hero@example.com", continue:"متابعة →",      checking:"جارٍ التحقق...", tagline:"أدخل بريدك الإلكتروني لحفظ التقدم.", tagline2:"استخدم نفس البريد على أي جهاز.", chooseTitle:"اختر اسمك", chooseSubtitle:"هكذا سيراك اللاعبون الآخرون.", usernameLabel:"اسم المستخدم", usernamePlaceholder:"HeroWarrior99", usernameHint:"أحرف وأرقام وشرطات سفلية فقط · 3–20 حرفاً", createBtn:"إنشاء حسابي →", back:"← رجوع", langLabel:"اللغة" }},
  { code:"hi", flag:"🇮🇳", name:"हिन्दी",            t:{ title:"आदत ट्रैकर",           emailLabel:"आपका ईमेल",      emailPlaceholder:"hero@example.com",    continue:"जारी रखें →",  checking:"जाँच...",        tagline:"प्रगति सहेजने के लिए ईमेल दर्ज करें।", tagline2:"किसी भी डिवाइस पर वही ईमेल उपयोग करें।", chooseTitle:"अपना नाम चुनें", chooseSubtitle:"अन्य खिलाड़ी इसी नाम से आपको देखेंगे।", usernameLabel:"उपयोगकर्ता नाम", usernamePlaceholder:"HeroWarrior99", usernameHint:"केवल अक्षर, अंक और अंडरस्कोर · 3–20 वर्ण", createBtn:"मेरा खाता बनाएं →", back:"← वापस", langLabel:"भाषा" }},
];

const ONBOARDING_STEPS = [
  { icon:"⚔️", title:"Welcome to FitQuest XP", body:"Turn your daily habits into an epic adventure. Complete challenges, earn XP, and level up every day.", color:"#FFD700" },
  { icon:"🔥", title:"Build Your Streak", body:"Open the app every day to grow your streak. Hit 3+ days in a row and unlock a +20% XP bonus on all habits!", color:"#FF6B35" },
  { icon:"🏆", title:"Climb the Ranks", body:"Earn enough XP to rise from Recruit all the way to Legendary. Keep grinding and become a legend!", color:"#00CFCF" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTodayStr() { return new Date().toISOString().slice(0,10); }
function haptic(pattern=[10]) { try { if(navigator.vibrate) navigator.vibrate(pattern); } catch {} }

const BLOCKED_WORDS = [
  "sex","porn","nude","naked","nsfw","xxx","anal","penis","vagina","cock","dick",
  "pussy","boobs","tit","tits","ass","anus","cum","fuck","shit","bitch","bastard","slut",
  "whore","cunt","nigger","nigga","faggot","retard","rape","rapist","pedophile",
  "gay","lesbian","masturbate","masturbation","jerk","jerking","jerkoff",
  "pedo","incest","racist","nazi","hitler","terrorist","kill","murder","suicide",
  "drugs","cocaine","heroin","meth","weed","drug","admin","moderator","staff",
  "support","official","fitquest","fitquestxp",
];

function isUsernameBlocked(username) {
  const lower = username.toLowerCase().replace(/[^a-z0-9]/g,"");
  return BLOCKED_WORDS.some(word => lower.includes(word));
}

function getRank(xp) {
  for(let i=RANKS.length-1;i>=0;i--) if(xp>=RANKS[i].minXP) return {rank:RANKS[i],index:i};
  return {rank:RANKS[0],index:0};
}



function getActiveEvent() {
  return XP_EVENTS.find(e=>e.active()) || null;
}

function getDailyMissions(dateStr) {
  let seed=dateStr.split("-").reduce((a,b)=>a+parseInt(b),0);
  const pool=[...MISSIONS_POOL]; const sel=[];
  while(sel.length<3&&pool.length>0){
    const idx=Math.abs(seed)%pool.length;
    sel.push(pool.splice(idx,1)[0]);
    seed=Math.floor(seed*1.7+13);
  }
  return sel;
}

function checkAchievements(data) {
  const earned=[...(data.badges||[])]; const newBadges=[];
  function check(id,cond){ if(!earned.includes(id)&&cond){earned.push(id);newBadges.push(id);} }
  check("first_login",true);
  check("streak_3",data.streak>=3);
  check("streak_7",data.streak>=7);
  check("streak_30",data.streak>=30);
  check("habits_10",(data.totalHabitsCompleted||0)>=10);
  check("habits_50",(data.totalHabitsCompleted||0)>=50);
  check("habits_100",(data.totalHabitsCompleted||0)>=100);~
  check("perfect_day",data.habits&&data.habits.length>0&&data.habits.every(h=>h.completedToday));
  check("rank_bronze",data.xp>=200);
  check("rank_silver",data.xp>=600);
  check("rank_gold",data.xp>=1500);
  check("rank_plat",data.xp>=3500);
  check("rank_diamond",data.xp>=7000);
  check("rank_legendary",data.xp>=15000);
  check("rank_mythic",data.xp>=30000);
  check("rank_immortal",data.xp>=55000);
  check("rank_celestial",data.xp>=90000);
  check("rank_cosmic",data.xp>=140000);
  check("rank_divine",data.xp>=210000);
  check("rank_eternal",data.xp>=300000);
  check("rank_transcendent",data.xp>=500000);
  check("xp_1000",data.xp>=1000);
  check("xp_5000",data.xp>=5000);
  check("missions_5",(data.totalMissionsCompleted||0)>=5);
  check("loot_3",(data.totalLootOpened||0)>=3);
  return {updatedBadges:earned,newBadges};
}

function getTheme(isDark) {
  return isDark ? {
    bg:"#0a0a0f", card:"#12121a", card2:"#0d0d14", border:"#1e1e2e",
    border2:"#2a2a3a", text:"#e0e0e0", textMuted:"#888", textFaint:"#444",
    inputBg:"#0a0a12", modalBg:"#0e0e1a", statBox:"linear-gradient(135deg,#12121a,#0d0d14)",
    habitCard:"linear-gradient(135deg,#12121a,#0d0d14)", rankCardUnlocked:"linear-gradient(135deg,#0e0e16,#0a0a10)",
    tabActiveBg:"", gridColor:"rgba(255,215,0,.015)",
  } : {
    bg:"#f0f0f8", card:"#ffffff", card2:"#f4f4fc", border:"#e0e0ee",
    border2:"#d0d0e8", text:"#1a1a2e", textMuted:"#666", textFaint:"#aaa",
    inputBg:"#f8f8ff", modalBg:"#ffffff", statBox:"linear-gradient(135deg,#ffffff,#f4f4fc)",
    habitCard:"linear-gradient(135deg,#ffffff,#f8f8ff)", rankCardUnlocked:"linear-gradient(135deg,#f4f4fc,#eeeef8)",
    tabActiveBg:"", gridColor:"rgba(100,100,200,.03)",
  };
}

// ── Splash Screen ─────────────────────────────────────────────────────────────
function SplashScreen({onDone}) {
  useEffect(()=>{ const t=setTimeout(onDone,2400); return ()=>clearTimeout(t); },[]);
  return (
    <div style={{position:"fixed",inset:0,background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",zIndex:99999,animation:"splashFade 2.4s ease forwards"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Orbitron:wght@400;700;900&display=swap');
        @keyframes splashFade{0%{opacity:1}80%{opacity:1}100%{opacity:0;pointer-events:none}}
        @keyframes splashPop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.1);opacity:1}100%{transform:scale(1);opacity:1}}
        @keyframes splashGlow{0%,100%{text-shadow:0 0 20px #FFD700}50%{text-shadow:0 0 60px #FFD700,0 0 100px #FF6B35}}
        @keyframes splashRing{0%{transform:scale(0.8);opacity:0}100%{transform:scale(2.5);opacity:0}}
      `}</style>
      <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24}}>
        <div style={{position:"absolute",width:80,height:80,borderRadius:"50%",border:"2px solid #FFD700",animation:"splashRing 1.5s ease-out .3s infinite"}}/>
        <div style={{position:"absolute",width:80,height:80,borderRadius:"50%",border:"2px solid #FF6B35",animation:"splashRing 1.5s ease-out .6s infinite"}}/>
        <div style={{fontSize:"5rem",animation:"splashPop .6s cubic-bezier(.34,1.56,.64,1) forwards"}}>⚔️</div>
      </div>
      <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"2rem",margin:0,background:"linear-gradient(135deg,#FFD700,#FF6B35)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"splashGlow 2s ease infinite"}}>FitQuest XP</h1>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:".6rem",color:"#555",letterSpacing:"4px",textTransform:"uppercase",marginTop:10}}>Loading your quest...</div>
      <div style={{marginTop:30,width:120,height:3,background:"#1a1a2e",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",background:"linear-gradient(90deg,#FFD700,#FF6B35)",borderRadius:2,animation:"splashBar 2s ease forwards"}}/>
      </div>
      <style>{`@keyframes splashBar{from{width:0}to{width:100%}}`}</style>
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────
function OnboardingScreen({onDone,TH}) {
  const [step,setStep]=useState(0);
  const isLast = step===ONBOARDING_STEPS.length-1;
  const s = ONBOARDING_STEPS[step];
  return (
    <div style={{position:"fixed",inset:0,background:TH.bg,display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000,padding:20}}>
      <div style={{width:"100%",maxWidth:380,textAlign:"center",animation:"fadeInUp .4s ease"}}>
        <div style={{fontSize:"5rem",marginBottom:20,animation:"float 2s ease-in-out infinite"}}>{s.icon}</div>
        <h2 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.3rem",color:s.color,marginBottom:12,textShadow:`0 0 20px ${s.color}60`}}>{s.title}</h2>
        <p style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"1rem",color:TH.textMuted,lineHeight:1.6,marginBottom:32}}>{s.body}</p>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:28}}>
          {ONBOARDING_STEPS.map((_,i)=>(
            <div key={i} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?s.color:TH.border,transition:"all .3s ease"}}/>
          ))}
        </div>
        <button onClick={()=>isLast?onDone():setStep(s=>s+1)} style={{width:"100%",background:`linear-gradient(135deg,${s.color}30,${s.color}20)`,border:`1px solid ${s.color}`,color:s.color,padding:"14px",borderRadius:10,fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:".9rem",cursor:"pointer",letterSpacing:"2px",textTransform:"uppercase",transition:"all .2s"}}>
          {isLast?"Let's Go! →":"Next →"}
        </button>
        {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{marginTop:10,background:"none",border:"none",color:TH.textFaint,fontFamily:"'Orbitron',monospace",fontSize:".6rem",cursor:"pointer",letterSpacing:"1px"}}>← Back</button>}
        <button onClick={onDone} style={{display:"block",margin:"10px auto 0",background:"none",border:"none",color:TH.textFaint,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",letterSpacing:"1px"}}>Skip</button>
      </div>
    </div>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti({onDone}) {
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    canvas.width=window.innerWidth; canvas.height=window.innerHeight;
    const ctx=canvas.getContext("2d");
    const colors=["#FFD700","#FF6B35","#00CFCF","#4CAF50","#9B59B6","#66CCFF","#FF4444","#ffffff"];
    const particles=Array.from({length:180},()=>({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height-canvas.height,
      w:Math.random()*14+4, h:Math.random()*7+2,
      color:colors[Math.floor(Math.random()*colors.length)],
      vx:(Math.random()-.5)*5, vy:Math.random()*5+2,
      angle:Math.random()*360, spin:(Math.random()-.5)*10, opacity:1,
    }));
    let frame=0; let animId;
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      frame++;
      let alive=false;
      particles.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy; p.angle+=p.spin; p.vy+=0.12;
        if(frame>90) p.opacity-=0.018;
        if(p.opacity>0&&p.y<canvas.height+50) alive=true;
        ctx.save(); ctx.globalAlpha=Math.max(0,p.opacity);
        ctx.translate(p.x,p.y); ctx.rotate(p.angle*Math.PI/180);
        ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      });
      if(alive&&frame<300) animId=requestAnimationFrame(draw);
      else onDone();
    }
    draw();
    return ()=>cancelAnimationFrame(animId);
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,zIndex:5000,pointerEvents:"none",width:"100%",height:"100%"}}/>;
}

// ── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [step,setStep]=useState("email");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [username,setUsername]=useState("");
  const [avatar,setAvatar]=useState("💀");
  const [lang,setLang]=useState(()=>{try{return localStorage.getItem("fitxp_lang")||"en";}catch{return "en";}});
  const [langOpen,setLangOpen]=useState(false);
  const checkTimer=useRef(null);
  const [status,setStatus]=useState("idle");
  const [errorMsg,setErrorMsg]=useState("");
  const [unameStatus,setUnameStatus]=useState("idle"); // idle | checking | available | taken | empty
  const T=(LANGUAGES.find(l=>l.code===lang)||LANGUAGES[0]).t;

  async function handleEmailSubmit() {
    const trimmed=email.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)){setErrorMsg("Please enter a valid email address.");return;}
    if(!password||password.length<6){setErrorMsg("Password must be at least 6 characters.");return;}
    setStatus("loading");setErrorMsg("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmed, password);
      const userId = userCredential.user.uid;
      localStorage.setItem("fitxp_user_id", userId);
      const snap = await getDoc(doc(db, "users", userId));
      if(snap.exists()){
        onLogin(trimmed, snap.data(), false, null, null, userId);
      } else {
        onLogin(trimmed, null, false, null, null, userId);
      }
    } catch(err) {
      if(err.code==="auth/user-not-found"||err.code==="auth/invalid-credential"||err.code==="auth/invalid-email") {
        setStatus("idle"); setStep("username");
      } else if(err.code==="auth/wrong-password") {
        setErrorMsg("Incorrect password. Please try again."); setStatus("idle");
      } else {
        setStatus("idle"); setStep("username");
      }
    }
  }

  async function handleUsernameSubmit() {
    const uname=username.trim();
    if(uname.length===0||uname.trim().length===0){setErrorMsg("Username needs to have letters.");return;}
    if(uname.length<3){setErrorMsg("Username must be at least 3 characters.");return;}
    if(uname.length>20){setErrorMsg("Username must be 20 characters or less.");return;}
    if(!/^[a-zA-Z0-9_]+$/.test(uname)){setErrorMsg("Only letters, numbers and underscores allowed.");return;}
    if(isUsernameBlocked(uname)){setErrorMsg("This username cannot be used.");return;}
    if(unameStatus==="taken"){setErrorMsg("Username not available.");return;}
    if(unameStatus!=="available"){setErrorMsg("Wait for availability check to finish.");return;}
    setStatus("loading");setErrorMsg("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const userId = userCredential.user.uid;
      localStorage.setItem("fitxp_user_id", userId);
      await setDoc(doc(db, "usernames", uname.toLowerCase()), { email: email.trim().toLowerCase(), uid: userId });
      onLogin(email.trim().toLowerCase(), null, true, uname, avatar, userId);
    } catch(err) {
      if(err.code==="auth/email-already-in-use"){
        setErrorMsg("This email is already registered. Go back and sign in.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
      setStatus("idle");
    }
  }

  function handleUsernameChange(val) {
    setUsername(val); setErrorMsg(""); setUnameStatus("idle");
    if(checkTimer.current) clearTimeout(checkTimer.current);
    if(val.length>0 && val.trim().length===0){setUnameStatus("empty");return;}
    if(isUsernameBlocked(val)){setUnameStatus("blocked");return;}
    if(val.trim().length>=3 && /^[a-zA-Z0-9_]+$/.test(val.trim())){
      setUnameStatus("checking");
      checkTimer.current=setTimeout(async()=>{
        try{
          const snap=await getDoc(doc(db,"usernames",val.trim().toLowerCase()));
          setUnameStatus(snap.exists()?"taken":"available");
        }catch{setUnameStatus("available");}
      },400);
    }
  }

  const cardStyle={width:"100%",maxWidth:420,background:"linear-gradient(135deg,#0e0e1a,#0a0a12)",border:"1px solid #1e1e2e",borderRadius:20,padding:"36px 28px",boxShadow:"0 30px 80px rgba(0,0,0,.8)",position:"relative",animation:"fadeInUp .4s ease forwards"};

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Rajdhani','Segoe UI',sans-serif",padding:"20px"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');
        @keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bgPL{0%,100%{opacity:.03}50%{opacity:.06}}
        @keyframes dropDown{from{opacity:0;transform:translateY(-8px) scaleY(.85);transform-origin:top}to{opacity:1;transform:translateY(0) scaleY(1);transform-origin:top}}
        .lg-input{width:100%;background:#0a0a12;border:1px solid #2a2a3a;color:#e0e0e0;padding:12px 16px;border-radius:10px;font-family:'Rajdhani',sans-serif;font-size:1.05rem;outline:none;box-sizing:border-box;transition:border-color .2s;margin-bottom:4px;}
        .lg-input:focus{border-color:#FFD700;box-shadow:0 0 0 2px rgba(255,215,0,.1);}
        .lg-input.err{border-color:#FF4444;}
        .lg-btn{width:100%;background:linear-gradient(135deg,#2a2000,#3a2800);border:1px solid #FFD700;color:#FFD700;padding:13px;border-radius:10px;font-family:'Orbitron',monospace;font-weight:700;font-size:.85rem;cursor:pointer;text-transform:uppercase;letter-spacing:2px;transition:all .2s ease;margin-top:8px;}
        .lg-btn:hover{background:linear-gradient(135deg,#3a2800,#4a3800);box-shadow:0 0 20px rgba(255,215,0,.3);}
        .lg-btn:disabled{opacity:.5;cursor:not-allowed;}
        .bg-gl{position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,215,0,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,.015) 1px,transparent 1px);background-size:40px 40px;animation:bgPL 4s ease-in-out infinite;}
        .av-btn{width:46px;height:46px;border-radius:10px;border:2px solid #1e1e2e;background:#0a0a12;font-size:1.4rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}
        .av-btn:hover,.av-btn.sel{border-color:#FFD700;background:rgba(255,215,0,.08);transform:scale(1.1);}
      `}</style>
      <div className="bg-gl"/>

      {step==="email" && (
        <div style={cardStyle}>
          <div style={{position:"absolute",top:-40,right:-40,width:120,height:120,background:"radial-gradient(circle,rgba(255,215,0,.08),transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:"3.2rem",animation:"float2 3s ease-in-out infinite",marginBottom:10}}>⚔️</div>
            <h1 style={{fontFamily:"'Cinzel Decorative',serif",margin:0,fontSize:"1.5rem",background:"linear-gradient(135deg,#FFD700 0%,#FF6B35 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>FitQuest XP</h1>
            <p style={{color:"#555",fontFamily:"'Orbitron',monospace",fontSize:".55rem",letterSpacing:"3px",textTransform:"uppercase",marginTop:6}}>{T.title}</p>
          </div>
          <label style={{display:"block",color:"#666",fontFamily:"'Orbitron',monospace",fontSize:".55rem",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>{T.emailLabel}</label>
          <input className={`lg-input${errorMsg?" err":""}`} type="email" placeholder={T.emailPlaceholder} value={email}
            onChange={e=>{setEmail(e.target.value);setErrorMsg("");}}
            onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}/>
          <label style={{display:"block",color:"#666",fontFamily:"'Orbitron',monospace",fontSize:".55rem",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6,marginTop:10}}>Password</label>
          <input className={`lg-input${errorMsg?" err":""}`} type="password" placeholder="Min. 6 characters" value={password}
            onChange={e=>{setPassword(e.target.value);setErrorMsg("");}}
            onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}/>
          {errorMsg&&<div style={{color:"#FF4444",fontFamily:"'Orbitron',monospace",fontSize:".55rem",marginBottom:6,letterSpacing:"1px"}}>⚠ {errorMsg}</div>}

          {/* Language Picker */}
          <div style={{marginTop:8,marginBottom:12,position:"relative",zIndex:10}}>
            <button onClick={()=>setLangOpen(o=>!o)} style={{width:"100%",background:"#0a0a12",border:`1px solid ${langOpen?"#FFD700":"#2a2a3a"}`,borderRadius:10,padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"border-color .2s"}}>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:".5rem",color:"#555",letterSpacing:"2px",textTransform:"uppercase"}}>{T.langLabel}</span>
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:"1.1rem"}}>{(LANGUAGES.find(l=>l.code===lang)||LANGUAGES[0]).flag}</span>
                <span style={{fontFamily:"'Rajdhani',sans-serif",color:"#d0d0d0",fontSize:".9rem"}}>{(LANGUAGES.find(l=>l.code===lang)||LANGUAGES[0]).name}</span>
                <span style={{color:"#555",fontSize:".65rem"}}>{langOpen?"▲":"▼"}</span>
              </span>
            </button>
            {langOpen&&(
              <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#0e0e1a",border:"1px solid #2a2a3a",borderRadius:10,zIndex:200,maxHeight:220,overflowY:"auto",boxShadow:"0 16px 50px rgba(0,0,0,.95)",animation:"dropDown .25s cubic-bezier(.16,1,.3,1) forwards"}}>
                {LANGUAGES.map(l=>(
                  <button key={l.code} onClick={()=>{setLang(l.code);try{localStorage.setItem("fitxp_lang",l.code);}catch{}setLangOpen(false);}} style={{width:"100%",background:lang===l.code?"rgba(255,215,0,.08)":"transparent",border:"none",borderBottom:"1px solid #1a1a2a",padding:"9px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",textAlign:"left"}}>
                    <span style={{fontSize:"1.1rem"}}>{l.flag}</span>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".95rem",color:lang===l.code?"#FFD700":"#d0d0d0",fontWeight:lang===l.code?700:400}}>{l.name}</span>
                    {lang===l.code&&<span style={{marginLeft:"auto",color:"#FFD700",fontSize:".75rem"}}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="lg-btn" onClick={handleEmailSubmit} disabled={status==="loading"}>
            {status==="loading"?T.checking:T.continue}
          </button>
          <p style={{color:"#333",fontSize:".72rem",textAlign:"center",marginTop:12,fontFamily:"'Rajdhani',sans-serif",lineHeight:1.5}}>{T.tagline}<br/>{T.tagline2}</p>
        </div>
      )}

      {step==="username" && (
        <div style={cardStyle}>
          <div style={{position:"absolute",top:-40,right:-40,width:120,height:120,background:"radial-gradient(circle,rgba(255,215,0,.08),transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
          <button style={{background:"none",border:"none",color:"#555",fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",letterSpacing:"1px",marginBottom:14,padding:0}} onClick={()=>{setStep("email");setErrorMsg("");setUsername("");}}>← Back</button>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:"2.8rem",marginBottom:8}}>🧙</div>
            <h2 style={{fontFamily:"'Cinzel Decorative',serif",margin:0,fontSize:"1.2rem",color:"#FFD700"}}>{T.chooseTitle}</h2>
            <p style={{color:"#555",fontFamily:"'Rajdhani',sans-serif",fontSize:".85rem",marginTop:4}}>{T.chooseSubtitle}</p>
          </div>

          {/* Avatar Picker */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:"#666",fontFamily:"'Orbitron',monospace",fontSize:".55rem",letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>Pick Your Avatar</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,maxHeight:160,overflowY:"auto",padding:"4px 2px"}}>
              {AVATARS.map(av=>(
                <button key={av} className={`av-btn${avatar===av?" sel":""}`} onClick={()=>setAvatar(av)}>{av}</button>
              ))}
            </div>
            <div style={{marginTop:8,textAlign:"center",fontSize:"2rem"}}>{avatar} <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".8rem",color:"#666",verticalAlign:"middle"}}>selected</span></div>
          </div>

          <label style={{display:"block",color:"#666",fontFamily:"'Orbitron',monospace",fontSize:".55rem",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>{T.usernameLabel}</label>
          <input className={`lg-input${unameStatus==="taken"||unameStatus==="empty"?"  err":unameStatus==="available"?" av":""}`}
            style={{borderColor:unameStatus==="taken"||unameStatus==="empty"?"#FF4444":unameStatus==="available"?"#4CAF50":undefined}}
            type="text" placeholder={T.usernamePlaceholder} value={username}
            onChange={e=>handleUsernameChange(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleUsernameSubmit()} maxLength={20}/>
          {/* Real-time availability feedback */}
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",letterSpacing:"1px",marginBottom:8,minHeight:18,
            color:unameStatus==="taken"?"#FF4444":unameStatus==="available"?"#4CAF50":unameStatus==="empty"?"#FF4444":unameStatus==="blocked"?"#FF4444":unameStatus==="checking"?"#FFD700":"#333"}}>
            {unameStatus==="checking"&&"⏳ Checking availability..."}
            {unameStatus==="taken"&&"🔒 Username not available"}
            {unameStatus==="available"&&"✓ Username is available!"}
            {unameStatus==="empty"&&"⚠ Username needs to have letters"}
            {unameStatus==="blocked"&&"🚫 This username cannot be used"}
            {(unameStatus==="idle"||!unameStatus)&&<span style={{color:"#333"}}>{T.usernameHint}</span>}
          </div>
          {errorMsg&&<div style={{color:"#FF4444",fontFamily:"'Orbitron',monospace",fontSize:".55rem",marginBottom:6,letterSpacing:"1px"}}>⚠ {errorMsg}</div>}
          <button className="lg-btn" onClick={handleUsernameSubmit}
            disabled={status==="loading"||unameStatus==="taken"||unameStatus==="checking"||unameStatus==="empty"||unameStatus==="blocked"}
            style={{opacity:unameStatus==="taken"||unameStatus==="checking"||unameStatus==="empty"||unameStatus==="blocked"?.5:1}}>
            {status==="loading"?T.checking:T.createBtn}
          </button>
        </div>
      )}
    </div>
  );
}

// ── XP Popup ──────────────────────────────────────────────────────────────────
function XPPopup({amount,id}) {
  return <div key={id} style={{position:"fixed",pointerEvents:"none",top:"40%",left:"50%",transform:"translateX(-50%)",fontSize:"2.5rem",fontFamily:"'Cinzel Decorative',serif",color:"#FFD700",textShadow:"0 0 20px #FFD700,0 0 40px #FF6B35",animation:"xpFloat 1.5s ease-out forwards",zIndex:9999,fontWeight:900}}>+{amount} XP ✨</div>;
}

// ── Achievement Toast ─────────────────────────────────────────────────────────
function AchievementToast({badge,onDone}) {
  useEffect(()=>{const t=setTimeout(onDone,3500);return()=>clearTimeout(t);},[]);
  const ach=ACHIEVEMENTS.find(a=>a.id===badge); if(!ach) return null;
  return (
    <div style={{position:"fixed",top:16,right:16,zIndex:4000,background:"linear-gradient(135deg,#1a1200,#2a1800)",border:"1px solid #FFD700",borderRadius:14,padding:"14px 18px",boxShadow:"0 0 30px rgba(255,215,0,.3)",animation:"toastSlide .4s ease",maxWidth:260}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:"2rem"}}>{ach.icon}</div>
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:".5rem",color:"#FFD700",letterSpacing:"2px",textTransform:"uppercase"}}>Achievement Unlocked!</div>
          <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:".85rem",color:"#fff",marginTop:2}}>{ach.name}</div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".72rem",color:"#888"}}>{ach.desc}</div>
        </div>
      </div>
    </div>
  );
}

// ── Notif Banner ──────────────────────────────────────────────────────────────
function NotifBanner({msg,onDone}) {
  useEffect(()=>{const t=setTimeout(onDone,4000);return()=>clearTimeout(t);},[]);
  return (
    <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:4000,background:"linear-gradient(135deg,#001a10,#0a0a0f)",border:"1px solid #4CAF50",borderRadius:14,padding:"12px 20px",boxShadow:"0 0 20px rgba(76,175,80,.3)",animation:"toastSlide .4s ease",whiteSpace:"nowrap"}}>
      <span style={{fontFamily:"'Orbitron',monospace",fontSize:".6rem",color:"#4CAF50",letterSpacing:"1px"}}>🔔 {msg}</span>
    </div>
  );
}

// ── Loot Box Modal ────────────────────────────────────────────────────────────
function LootBoxModal({onOpen,onClose}) {
  const [phase,setPhase]=useState("idle");
  const [reward,setReward]=useState(null);
  function handleTap(){
    if(phase!=="idle") return;
    setPhase("opening");
    const r=LOOT_REWARDS[Math.floor(Math.random()*LOOT_REWARDS.length)];
    setReward(r); haptic([50,30,80]);
    setTimeout(()=>setPhase("revealed"),800);
  }
  return (
    <div style={{position:"fixed",inset:0,zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.92)",backdropFilter:"blur(8px)"}} onClick={phase==="idle"?handleTap:undefined}>
      <div style={{textAlign:"center",padding:20}}>
        {phase==="idle"&&(
          <div>
            <div style={{fontSize:"6rem",animation:"lootBounce .8s ease-in-out infinite",cursor:"pointer",filter:"drop-shadow(0 0 20px #FFD700)"}}>📦</div>
            <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.4rem",color:"#FFD700",marginTop:16,textShadow:"0 0 20px #FFD700"}}>Loot Box!</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:".6rem",color:"#888",marginTop:8,letterSpacing:"2px"}}>TAP TO OPEN</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".8rem",color:"#444",marginTop:6}}>You completed all habits today!</div>
            <button onClick={e=>{e.stopPropagation();onClose();}} style={{marginTop:20,background:"none",border:"1px solid #222",color:"#444",padding:"8px 20px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".5rem",cursor:"pointer",letterSpacing:"1px",display:"block",margin:"20px auto 0"}}>SKIP</button>
          </div>
        )}
        {phase==="opening"&&<div style={{fontSize:"6rem",animation:"lootShake .8s ease-in-out"}}>📬</div>}
        {phase==="revealed"&&reward&&(
          <div style={{animation:"fadeIn .5s ease"}}>
            <div style={{fontSize:"5rem",animation:"lootBounce 1s ease-in-out infinite",filter:`drop-shadow(0 0 20px ${reward.color})`}}>{reward.icon}</div>
            <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"2rem",color:reward.color,marginTop:16,textShadow:`0 0 30px ${reward.color}`}}>{reward.label}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"1rem",color:"#888",marginTop:8}}>Added to your account</div>
            <button onClick={()=>onOpen(reward)} style={{marginTop:20,background:`linear-gradient(135deg,#2a2000,#3a2800)`,border:`1px solid ${reward.color}`,color:reward.color,padding:"12px 32px",borderRadius:10,fontFamily:"'Orbitron',monospace",fontSize:".75rem",cursor:"pointer",letterSpacing:"2px",textTransform:"uppercase"}}>CLAIM REWARD</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Achievements Tab ──────────────────────────────────────────────────────────
function AchievementsTab({badges,TH}) {
  const earned=badges||[]; const total=ACHIEVEMENTS.length;
  const pct=Math.round((earned.length/total)*100);
  return (
    <div>
      <div style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:12,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:"2rem"}}>🏆</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px"}}>PROGRESS</div>
          <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1rem",color:"#FFD700"}}>{earned.length} / {total} Badges</div>
          <div style={{background:TH.border,borderRadius:4,height:6,marginTop:6,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#FFD70080,#FFD700)",borderRadius:4,transition:"width .6s ease"}}/>
          </div>
        </div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"1.2rem",color:"#FFD700",fontWeight:700}}>{pct}%</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {ACHIEVEMENTS.map(ach=>{
          const isEarned=earned.includes(ach.id);
          return (
            <div key={ach.id} style={{background:isEarned?"linear-gradient(135deg,#1a1200,#0d0d14)":TH.card2,border:`1px solid ${isEarned?"#FFD70040":TH.border}`,borderRadius:12,padding:"12px",textAlign:"center",transition:"all .2s",position:"relative",overflow:"hidden"}}>
              {isEarned&&<div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,215,0,.3),transparent)"}}/>}
              <div style={{position:"relative",display:"inline-block",marginBottom:6}}>
                <div style={{fontSize:"2rem",filter:isEarned?"none":"grayscale(100%) brightness(.35)"}}>{ach.icon}</div>
                {!isEarned&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem"}}>🔒</div>}
              </div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:".82rem",color:isEarned?"#FFD700":TH.textFaint}}>{ach.name}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".68rem",color:TH.textFaint,marginTop:2,lineHeight:1.3}}>{ach.desc}</div>
              {ach.xpReward>0&&isEarned&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:".5rem",color:"#4CAF50",marginTop:4}}>+{ach.xpReward} XP earned</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Missions Tab ──────────────────────────────────────────────────────────────
function MissionsTab({habits,appData,onMissionComplete,TH}) {
  const today=getTodayStr();
  const missions=getDailyMissions(today);
  const completedIds=(appData.missionsCompletedByDate||{})[today]||[];
  return (
    <div>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px",textTransform:"uppercase",marginBottom:12,textAlign:"center"}}>🎯 Daily Missions — Refreshes at midnight</div>
      {missions.map((m,i)=>{
        const isDone=completedIds.includes(m.id);
        const isAchieved=m.check(habits);
        const canClaim=isAchieved&&!isDone;
        return (
          <div key={m.id} style={{background:isDone?"linear-gradient(135deg,#0d140d,#0a100a)":canClaim?"linear-gradient(135deg,#001a10,#0d0d14)":TH.habitCard,border:`1px solid ${isDone?"#1e2e1e":canClaim?"#4CAF5060":TH.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,animation:"slideIn .3s ease forwards",animationDelay:`${i*.1}s`,opacity:0,animationFillMode:"forwards"}}>
            <div style={{fontSize:"1.8rem",flexShrink:0,filter:isDone?"grayscale(50%)":"none"}}>{m.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1rem",color:isDone?"#555":canClaim?"#4CAF50":TH.text,textDecoration:isDone?"line-through":"none"}}>{m.name}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".78rem",color:TH.textMuted,marginTop:1}}>{m.desc}</div>
            </div>
            <div style={{flexShrink:0,textAlign:"center"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:".68rem",color:"#FFD700"}}>+{m.xp}</div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:".42rem",color:TH.textFaint}}>XP</div>
            </div>
            {isDone?<div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:"#4CAF50",flexShrink:0}}>✓ DONE</div>:
              canClaim?<button onClick={()=>onMissionComplete(m)} style={{background:"linear-gradient(135deg,#003a10,#001a08)",border:"1px solid #4CAF50",color:"#4CAF50",padding:"6px 10px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".52rem",cursor:"pointer",letterSpacing:"1px",flexShrink:0}}>CLAIM</button>:
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:".5rem",color:TH.textFaint,flexShrink:0}}>IN PROGRESS</div>}
          </div>
        );
      })}
      <div style={{marginTop:8,padding:"10px 14px",background:TH.card2,borderRadius:8,border:`1px solid ${TH.border}`}}>
        <div style={{fontSize:".65rem",color:TH.textFaint,fontFamily:"'Orbitron',monospace",letterSpacing:"1px"}}>💡 Total missions completed: {appData.totalMissionsCompleted||0}</div>
      </div>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({appData,TH}) {
  const [period,setPeriod]=useState("week");
  const xpHistory=appData.xpHistory||{};
  const today=new Date();
  const days=period==="week"?7:30;
  const chartData=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date(today); d.setDate(d.getDate()-i);
    const ds=d.toISOString().slice(0,10);
    const label=period==="week"?["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]:d.getDate().toString();
    chartData.push({label,xp:xpHistory[ds]||0,date:ds});
  }
  const totalXP=Object.values(xpHistory).reduce((a,b)=>a+b,0);
  const avgXP=chartData.length>0?Math.round(chartData.reduce((a,b)=>a+b.xp,0)/chartData.length):0;
  const bestDay=[...chartData].sort((a,b)=>b.xp-a.xp)[0];
  const activeDays=chartData.filter(d=>d.xp>0).length;
  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {["week","month"].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} style={{flex:1,background:period===p?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",border:`1px solid ${period===p?"#FFD700":TH.border2}`,color:period===p?"#FFD700":TH.textFaint,padding:"8px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",textTransform:"uppercase",letterSpacing:"1px",transition:"all .2s"}}>
            {p==="week"?"7 Days":"30 Days"}
          </button>
        ))}
      </div>
      <div style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:12,padding:"16px",marginBottom:12}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px",marginBottom:12}}>XP EARNED PER DAY</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} margin={{top:4,right:4,bottom:4,left:-20}}>
            <CartesianGrid strokeDasharray="3 3" stroke={TH.border} vertical={false}/>
            <XAxis dataKey="label" tick={{fill:TH.textFaint,fontSize:10,fontFamily:"Orbitron,monospace"}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:TH.textFaint,fontSize:10,fontFamily:"Orbitron,monospace"}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,fontFamily:"Orbitron,monospace",fontSize:11}} labelStyle={{color:"#FFD700"}} itemStyle={{color:"#FFD700"}} formatter={v=>[v+" XP","Earned"]}/>
            <Bar dataKey="xp" fill="#FFD700" radius={[4,4,0,0]} opacity={0.85}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[{label:"TOTAL XP",value:totalXP.toLocaleString(),color:"#FFD700",icon:"⚡"},{label:"DAILY AVG",value:avgXP+" XP",color:"#4CAF50",icon:"📊"},{label:"ACTIVE DAYS",value:`${activeDays}/${days}`,color:"#00CFCF",icon:"📅"},{label:"BEST DAY",value:bestDay&&bestDay.xp>0?bestDay.xp+" XP":"—",color:"#FF6B35",icon:"🔥"}].map(stat=>(
          <div key={stat.label} style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:12,padding:"14px",textAlign:"center"}}>
            <div style={{fontSize:"1.2rem",marginBottom:4}}>{stat.icon}</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:".45rem",color:TH.textFaint,letterSpacing:"2px",marginBottom:4}}>{stat.label}</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:".95rem",color:stat.color,fontWeight:700}}>{stat.value}</div>
          </div>
        ))}
      </div>
      <div style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:12,padding:"14px"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px",marginBottom:10}}>ALL-TIME STATS</div>
        {[{label:"Total XP Earned",value:(appData.xp||0).toLocaleString()+" XP"},{label:"Habits Completed",value:(appData.totalHabitsCompleted||0).toString()},{label:"Best Streak",value:(appData.bestStreak||0)+" days 🔥"},{label:"Missions Completed",value:(appData.totalMissionsCompleted||0).toString()},{label:"Loot Boxes Opened",value:(appData.totalLootOpened||0).toString()},{label:"Badges Earned",value:`${(appData.badges||[]).length} / ${ACHIEVEMENTS.length}`}].map(row=>(
          <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${TH.border}`}}>
            <span style={{fontFamily:"'Rajdhani',sans-serif",color:TH.textMuted,fontSize:".88rem"}}>{row.label}</span>
            <span style={{fontFamily:"'Orbitron',monospace",color:TH.text,fontSize:".72rem"}}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Global Leaderboard Tab ────────────────────────────────────────────────────
function GlobalLeaderboardTab({userEmail,userXp,userStreak,username,avatar,TH}) {
  const displayName=username||(userEmail?userEmail.split("@")[0]:"You");
  const [allEntries,setAllEntries]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    async function load(){
      setLoading(true);
      try{
        const snapshot = await getDocs(collection(db,"leaderboard"));
        const entries = [];
        snapshot.forEach(doc=>entries.push(doc.data()));
        const me={id:userEmail,name:displayName,xp:userXp,streak:userStreak,avatar:avatar||"💀",isMe:true};
        setAllEntries([...entries.filter(e=>e.id!==userEmail),me].sort((a,b)=>b.xp-a.xp));
      }catch{
        setAllEntries([{id:userEmail,name:displayName,xp:userXp,streak:userStreak,avatar:avatar||"💀",isMe:true}]);
      }
      setLoading(false);
    }
    async function save(){
      try{
        const userId=localStorage.getItem("fitxp_user_id");
        if(!userId){console.log("No userId for leaderboard save");return;}
        await setDoc(doc(db,"leaderboard",userEmail),{
          id:userEmail,
          name:displayName,
          xp:userXp,
          streak:userStreak,
          avatar:avatar||"💀",
          isMe:false
        });
        console.log("Leaderboard saved for:",userEmail);
      }catch(e){console.log("leaderboard save error",e);}
    }
    save().then(load);
  },[userEmail,userXp,userStreak,displayName,avatar]);
  const myPos=allEntries.findIndex(e=>e.isMe)+1;
  return (
    <div>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px",textTransform:"uppercase",marginBottom:4,textAlign:"center"}}>🌍 Global Rankings</div>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".78rem",color:TH.textFaint,textAlign:"center",marginBottom:14}}>Only real players — no bots</div>
      {!loading&&(
        <div style={{background:"linear-gradient(135deg,#1a1400,#0d0d14)",border:"1px solid #FFD70050",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"1.1rem",color:"#FFD700",fontWeight:900,minWidth:36,textAlign:"center"}}>#{myPos}</div>
          <div style={{fontSize:"1.7rem"}}>{avatar||"⚔️"}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:"#FFD700",fontSize:".95rem"}}>Your Global Rank</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:".5rem",color:"#666",letterSpacing:"1px"}}>{allEntries.length>1?`Top ${Math.round((myPos/allEntries.length)*100)}% of ${allEntries.length} players`:"Be the first on the board!"}</div>
          </div>
          <div style={{textAlign:"right"}}><div style={{fontFamily:"'Orbitron',monospace",fontSize:".82rem",color:"#FFD700",fontWeight:700}}>{userXp.toLocaleString()}</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:".42rem",color:"#444"}}>XP</div></div>
        </div>
      )}
      {loading&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:"2rem",marginBottom:10,animation:"float 1s ease-in-out infinite"}}>⏳</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px"}}>LOADING...</div></div>}
      {!loading&&allEntries.map((entry,i)=>{
        const {rank}=getRank(entry.xp); const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
        return (
          <div key={entry.id} style={{background:entry.isMe?"linear-gradient(135deg,#1a1400,#0d0d14)":TH.habitCard,border:`1px solid ${entry.isMe?"#FFD70040":TH.border}`,borderRadius:12,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10,boxShadow:entry.isMe?"0 0 20px rgba(255,215,0,.06)":"none"}}>
            <div style={{width:26,textAlign:"center",flexShrink:0,fontFamily:"'Orbitron',monospace",fontSize:medal?"1rem":".72rem",color:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":TH.textFaint,fontWeight:700}}>{medal||`#${i+1}`}</div>
            <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${rank.color}30,${rank.color}10)`,border:`2px solid ${rank.color}60`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".95rem",flexShrink:0}}>{entry.avatar}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:".92rem",color:entry.isMe?"#FFD700":TH.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.name}{entry.isMe?" (you)":""}</div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:".48rem",color:rank.color}}>{rank.icon} {rank.name}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:"'Orbitron',monospace",fontSize:".72rem",color:"#FFD700",fontWeight:700}}>{entry.xp.toLocaleString()}</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:".42rem",color:TH.textFaint}}>{entry.streak}🔥</div></div>
          </div>
        );
      })}
      {!loading&&<div style={{marginTop:10,padding:"10px 14px",background:TH.card2,borderRadius:8,border:`1px solid ${TH.border}`}}><div style={{fontSize:".65rem",color:TH.textFaint,fontFamily:"'Orbitron',monospace",letterSpacing:"1px"}}>🌍 {allEntries.length} player{allEntries.length!==1?"s":""} · Updates on load</div></div>}
    </div>
  );
}

// ── Friends Tab ───────────────────────────────────────────────────────────────
function FriendsTab({userEmail,userXp,userStreak,username,avatar,TH}) {
  const [friends,setFriends]=useState([]);
  const [view,setView]=useState("list");
  const [showInvite,setShowInvite]=useState(false);
  const [showChallenge,setShowChallenge]=useState(null);
  const [challengeSent,setChallengeSent]=useState({});
  const [copied,setCopied]=useState(false);
  const [linkCopied,setLinkCopied]=useState(null);
  const inviteLink=`https://fitquestxp.vercel.app?ref=${encodeURIComponent(userEmail||"")}`;
  const PLATFORMS=[
    {name:"WhatsApp",icon:"💬",color:"#25D366",url:`https://wa.me/?text=Join%20me%20on%20FitQuest%20XP!%20${encodeURIComponent(inviteLink)}`},
    {name:"Telegram",icon:"✈️",color:"#229ED9",url:`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}`},
    {name:"Snapchat",icon:"👻",color:"#FFFC00",url:null},
    {name:"Instagram",icon:"📸",color:"#E1306C",url:null},
    {name:"X/Twitter",icon:"🐦",color:"#1DA1F2",url:`https://twitter.com/intent/tweet?text=Join%20me!%20${encodeURIComponent(inviteLink)}`},
    {name:"Copy Link",icon:"🔗",color:"#FFD700",url:null},
  ];
  function handleShare(p){if(p.url)window.open(p.url,"_blank");navigator.clipboard.writeText(inviteLink).catch(()=>{});setLinkCopied(p.name);setTimeout(()=>setLinkCopied(null),2000);}
  function sendChallenge(f){setChallengeSent(prev=>({...prev,[f.id]:true}));setTimeout(()=>setShowChallenge(null),1200);}
  const leaderboard=[{id:"me",name:username||(userEmail?userEmail.split("@")[0]:"You"),email:userEmail,xp:userXp,streak:userStreak,avatar:avatar||"⚔️",isMe:true},...friends].sort((a,b)=>b.xp-a.xp);
  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {["list","leaderboard"].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{flex:1,background:view===v?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",border:`1px solid ${view===v?"#FFD700":TH.border2}`,color:view===v?"#FFD700":TH.textFaint,padding:"8px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",textTransform:"uppercase",letterSpacing:"1px",transition:"all .2s"}}>
            {v==="list"?"👥 Friends":"🏆 Leaderboard"}
          </button>
        ))}
      </div>
      {view==="list"&&(
        <>
          <button onClick={()=>setShowInvite(true)} style={{width:"100%",marginBottom:12,background:"linear-gradient(135deg,#001a10,#001a00)",border:"1px dashed #4CAF50",color:"#4CAF50",padding:"12px",borderRadius:10,fontFamily:"'Orbitron',monospace",fontSize:".65rem",cursor:"pointer",letterSpacing:"2px",textTransform:"uppercase",transition:"all .2s"}}>＋ Invite Friends</button>
          {friends.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:TH.textFaint}}><div style={{fontSize:"3rem",marginBottom:10}}>👥</div><div>No friends yet! Invite someone to get started.</div></div>}
          {friends.map((f,i)=>{
            const {rank}=getRank(f.xp);
            return (
              <div key={f.id} style={{background:TH.habitCard,border:`1px solid ${TH.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10,animation:"slideIn .3s ease forwards",animationDelay:`${i*.05}s`,opacity:0,animationFillMode:"forwards"}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${rank.color}30,${rank.color}10)`,border:`2px solid ${rank.color}60`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>{f.avatar}</div>
                <div style={{flex:1}}><div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:".95rem",color:TH.text}}>{f.name}</div><div style={{display:"flex",gap:8,marginTop:2}}><span style={{fontFamily:"'Orbitron',monospace",fontSize:".52rem",color:rank.color}}>{rank.icon} {rank.name}</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:".52rem",color:"#FF6B35"}}>🔥{f.streak}</span></div></div>
                <div style={{textAlign:"right",marginRight:6}}><div style={{fontFamily:"'Orbitron',monospace",fontSize:".72rem",color:"#FFD700",fontWeight:700}}>{f.xp.toLocaleString()}</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:".42rem",color:TH.textFaint}}>XP</div></div>
                <button onClick={()=>setShowChallenge(f)} style={{background:challengeSent[f.id]?"rgba(76,175,80,.15)":"linear-gradient(135deg,#1a0800,#2a1000)",border:`1px solid ${challengeSent[f.id]?"#4CAF50":"#FF6B35"}`,color:challengeSent[f.id]?"#4CAF50":"#FF6B35",padding:"6px 8px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".52rem",cursor:"pointer",letterSpacing:"1px",transition:"all .2s",flexShrink:0}}>{challengeSent[f.id]?"✓":"⚔️"}</button>
                <button onClick={()=>setFriends(prev=>prev.filter(x=>x.id!==f.id))} style={{background:"none",border:"none",cursor:"pointer",color:TH.textFaint,fontSize:".8rem",padding:"4px",flexShrink:0}}>✕</button>
              </div>
            );
          })}
        </>
      )}
      {view==="leaderboard"&&(
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px",textAlign:"center",marginBottom:12}}>YOU VS FRIENDS</div>
          {leaderboard.map((e,i)=>{
            const {rank}=getRank(e.xp); const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
            return (
              <div key={e.id} style={{background:e.isMe?"linear-gradient(135deg,#1a1400,#0d0d14)":TH.habitCard,border:`1px solid ${e.isMe?"#FFD70040":TH.border}`,borderRadius:12,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:24,textAlign:"center",fontFamily:"'Orbitron',monospace",fontSize:medal?"1rem":".7rem",color:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":TH.textFaint,fontWeight:700}}>{medal||`#${i+1}`}</div>
                <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${rank.color}30,${rank.color}10)`,border:`2px solid ${rank.color}60`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".95rem",flexShrink:0}}>{e.avatar}</div>
                <div style={{flex:1}}><div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:".92rem",color:e.isMe?"#FFD700":TH.text}}>{e.name}{e.isMe?" (you)":""}</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:".48rem",color:rank.color}}>{rank.icon} {rank.name}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontFamily:"'Orbitron',monospace",fontSize:".72rem",color:"#FFD700",fontWeight:700}}>{e.xp.toLocaleString()}</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:".42rem",color:TH.textFaint}}>{e.streak}🔥</div></div>
              </div>
            );
          })}
        </div>
      )}
      {showInvite&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"}} onClick={()=>setShowInvite(false)}>
          <div style={{background:TH.modalBg,border:`1px solid ${TH.border}`,borderRadius:20,padding:"28px 24px",width:"90%",maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:"'Cinzel Decorative',serif",color:"#FFD700",margin:"0 0 6px",fontSize:"1.1rem",textAlign:"center"}}>Invite Friends</h2>
            <p style={{color:TH.textFaint,fontFamily:"'Orbitron',monospace",fontSize:".5rem",textAlign:"center",letterSpacing:"1px",marginBottom:16}}>Share your invite link</p>
            <div style={{background:TH.inputBg,border:`1px solid ${TH.border2}`,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
              <span style={{flex:1,fontFamily:"'Rajdhani',sans-serif",fontSize:".78rem",color:TH.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inviteLink}</span>
              <button onClick={()=>{navigator.clipboard.writeText(inviteLink).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{background:"linear-gradient(135deg,#1a1400,#2a2000)",border:"1px solid #FFD700",color:"#FFD700",padding:"6px 10px",borderRadius:6,fontFamily:"'Orbitron',monospace",fontSize:".5rem",cursor:"pointer",flexShrink:0}}>{copied?"✓ COPIED":"COPY"}</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {PLATFORMS.map(p=>(
                <button key={p.name} onClick={()=>handleShare(p)} style={{background:`${p.color}12`,border:`1px solid ${p.color}40`,color:p.color,padding:"10px 8px",borderRadius:10,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:".82rem",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .2s"}}>
                  <span>{p.icon}</span><span>{linkCopied===p.name?"✓ Done!":p.name}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setShowInvite(false)} style={{width:"100%",background:"none",border:`1px solid ${TH.border}`,color:TH.textFaint,padding:"10px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer"}}>CLOSE</button>
          </div>
        </div>
      )}
      {showChallenge&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"}} onClick={()=>setShowChallenge(null)}>
          <div style={{background:TH.modalBg,border:"1px solid #FF6B3540",borderRadius:20,padding:"24px",width:"90%",maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:"2.5rem"}}>⚔️</div><h2 style={{fontFamily:"'Cinzel Decorative',serif",color:"#FF6B35",margin:"8px 0 4px",fontSize:"1rem"}}>Challenge</h2><div style={{color:TH.textMuted,fontFamily:"'Rajdhani',sans-serif"}}>{showChallenge.name}</div></div>
            {[{label:"7-Day XP Race",desc:"Who earns most XP in 7 days?",icon:"🏁"},{label:"Streak Battle",desc:"Who keeps their streak longest?",icon:"🔥"},{label:"Daily Duel",desc:"Complete all habits today first!",icon:"💪"}].map(c=>(
              <button key={c.label} onClick={()=>sendChallenge(showChallenge)} style={{width:"100%",marginBottom:8,background:"linear-gradient(135deg,#1a0800,#0d0d10)",border:"1px solid #FF6B3530",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",textAlign:"left",transition:"all .2s"}} onMouseOver={e=>e.currentTarget.style.borderColor="#FF6B3570"} onMouseOut={e=>e.currentTarget.style.borderColor="#FF6B3530"}>
                <span style={{fontSize:"1.2rem"}}>{c.icon}</span>
                <div><div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:"#FF6B35",fontSize:".88rem"}}>{c.label}</div><div style={{fontFamily:"'Rajdhani',sans-serif",color:TH.textFaint,fontSize:".72rem"}}>{c.desc}</div></div>
              </button>
            ))}
            <button onClick={()=>setShowChallenge(null)} style={{width:"100%",background:"none",border:`1px solid ${TH.border}`,color:TH.textFaint,padding:"10px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",marginTop:4}}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({appData,userEmail,isDark,onToggleTheme,notifEnabled,onToggleNotif,onAvatarChange,onUsernameChange,onSignOut,showNotif,TH}) {
  const [newUsername,setNewUsername]=useState("");
  const [usernameStatus,setUsernameStatus]=useState("idle");
  const [showSignOutConfirm,setShowSignOutConfirm]=useState(false);
  const currentAvatar=appData.avatar||"⚔️";
  const currentUsername=appData.username||userEmail.split("@")[0];

  return (
    <div>
      {/* Account */}
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>ACCOUNT</div>
      <div style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:12,padding:"16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#FFD70030,#FFD70010)",border:"2px solid #FFD70060",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",flexShrink:0}}>{currentAvatar}</div>
          <div><div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:".9rem",color:"#FFD700"}}>{currentUsername}</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:".5rem",color:TH.textFaint,marginTop:2}}>{userEmail}</div></div>
        </div>
        {/* Avatar Picker */}
        <div style={{marginBottom:12}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:".5rem",color:TH.textFaint,letterSpacing:"2px",marginBottom:8}}>AVATAR</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
            {AVATARS.map(av=>(
              <button key={av} onClick={()=>onAvatarChange(av)} style={{width:"100%",aspectRatio:"1",borderRadius:10,border:`2px solid ${currentAvatar===av?"#FFD700":TH.border2}`,background:currentAvatar===av?"rgba(255,215,0,.1)":TH.inputBg,fontSize:"1.3rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",transform:currentAvatar===av?"scale(1.08)":"none"}}>{av}</button>
            ))}
          </div>
        </div>
        {/* Change Username */}
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:".5rem",color:TH.textFaint,letterSpacing:"2px",marginBottom:6}}>CHANGE USERNAME</div>
          <div style={{display:"flex",gap:8}}>
            <input type="text" placeholder={currentUsername} value={newUsername} maxLength={20}
              style={{flex:1,background:TH.inputBg,border:`1px solid ${usernameStatus==="taken"||usernameStatus==="empty"||usernameStatus==="blocked"?"#FF4444":usernameStatus==="available"?"#4CAF50":TH.border2}`,color:TH.text,padding:"8px 12px",borderRadius:8,fontFamily:"'Rajdhani',sans-serif",fontSize:".95rem",outline:"none"}}
              onChange={async e=>{
                const val=e.target.value; setNewUsername(val); setUsernameStatus("idle");
                if(val.length>0&&val.trim().length===0){setUsernameStatus("empty");return;}
                if(isUsernameBlocked(val)){setUsernameStatus("blocked");return;}
                if(val.trim().length>=3&&/^[a-zA-Z0-9_]+$/.test(val.trim())){
                  setUsernameStatus("checking");
                  try{const snap=await getDoc(doc(db,"usernames",val.trim().toLowerCase()));setUsernameStatus(snap.exists()?"taken":"available");}catch{setUsernameStatus("available");}
                }
              }}/>
            <button onClick={async()=>{
              if(usernameStatus!=="available")return;
              try{
                const old=(appData.username||"").toLowerCase();
                if(old)await deleteDoc(doc(db,"usernames",old)).catch(()=>{});
                await setDoc(doc(db,"usernames",newUsername.trim().toLowerCase()),{email:userEmail});
                onUsernameChange(newUsername.trim()); setNewUsername(""); setUsernameStatus("idle");
                showNotif(`Username changed to ${newUsername.trim()} ✓`);
              }catch{setUsernameStatus("error");}
            }} disabled={usernameStatus!=="available"} style={{background:usernameStatus==="available"?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",border:`1px solid ${usernameStatus==="available"?"#FFD700":TH.border}`,color:usernameStatus==="available"?"#FFD700":TH.textFaint,padding:"8px 14px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".52rem",cursor:usernameStatus==="available"?"pointer":"not-allowed",letterSpacing:"1px",flexShrink:0,transition:"all .2s"}}>SAVE</button>          </div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:".52rem",marginTop:5,letterSpacing:"1px",
            color:usernameStatus==="taken"?"#FF4444":usernameStatus==="available"?"#4CAF50":usernameStatus==="empty"?"#FF4444":usernameStatus==="checking"?"#FFD700":TH.textFaint}}>
            {usernameStatus==="checking"?"⏳ Checking...":usernameStatus==="taken"?"🔒 Username not available":usernameStatus==="available"?"✓ Available!":usernameStatus==="empty"?"⚠ Username needs to have letters":usernameStatus==="blocked"?"🚫 This username cannot be used":"Letters, numbers, underscores · 3–20 chars"}
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>APPEARANCE</div>
      <div style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:12,padding:"16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:TH.text,fontSize:"1rem"}}>{isDark?"🌙 Dark Mode":"☀️ Light Mode"}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",color:TH.textMuted,fontSize:".78rem"}}>Switch app theme</div>
          </div>
          <button onClick={onToggleTheme} style={{width:52,height:28,borderRadius:14,border:`1px solid ${isDark?"#FFD700":"#aaa"}`,background:isDark?"linear-gradient(135deg,#1a1400,#2a2000)":"linear-gradient(135deg,#f0e060,#e0c040)",cursor:"pointer",position:"relative",transition:"all .3s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:isDark?26:3,width:20,height:20,borderRadius:"50%",background:isDark?"#FFD700":"#fff",transition:"left .3s ease",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>NOTIFICATIONS</div>
      <div style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:12,padding:"16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:TH.text,fontSize:"1rem"}}>{notifEnabled?"🔔 Notifications On":"🔕 Notifications Off"}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",color:TH.textMuted,fontSize:".78rem"}}>Daily reminders to complete habits</div>
          </div>
          <button onClick={onToggleNotif} style={{width:52,height:28,borderRadius:14,border:`1px solid ${notifEnabled?"#4CAF50":"#333"}`,background:notifEnabled?"linear-gradient(135deg,#003a10,#001a08)":"linear-gradient(135deg,#1a1a2e,#0d0d14)",cursor:"pointer",position:"relative",transition:"all .3s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:notifEnabled?26:3,width:20,height:20,borderRadius:"50%",background:notifEnabled?"#4CAF50":"#333",transition:"left .3s ease",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:"#FF4444",letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>ACCOUNT ACTIONS</div>
      <div style={{background:TH.card,border:"1px solid #FF444430",borderRadius:12,padding:"16px"}}>
        {!showSignOutConfirm?(
          <button onClick={()=>setShowSignOutConfirm(true)} style={{width:"100%",background:"linear-gradient(135deg,#1a0000,#2a0000)",border:"1px solid #FF4444",color:"#FF4444",padding:"12px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:".75rem",cursor:"pointer",letterSpacing:"1px",transition:"all .2s"}}>Sign Out</button>
        ):(
          <div>
            <p style={{color:TH.textMuted,fontSize:".85rem",marginBottom:12,fontFamily:"'Rajdhani',sans-serif",lineHeight:1.5}}>Progress saved to <span style={{color:"#FFD700"}}>{userEmail}</span>. Sign back in anytime.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={onSignOut} style={{flex:1,background:"linear-gradient(135deg,#1a0000,#2a0000)",border:"1px solid #FF4444",color:"#FF4444",padding:"10px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".65rem",cursor:"pointer",letterSpacing:"1px"}}>Confirm Sign Out</button>
              <button onClick={()=>setShowSignOutConfirm(false)} style={{flex:1,background:"transparent",border:`1px solid ${TH.border}`,color:TH.textMuted,padding:"10px",borderRadius:8,fontFamily:"'Orbitron',monospace",fontSize:".65rem",cursor:"pointer",letterSpacing:"1px"}}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [showSplash,setShowSplash]=useState(true);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [userEmail,setUserEmail]=useState(()=>{try{return localStorage.getItem("fitxp_session_email")||null;}catch{return null;}});
  const [appData,setAppData]=useState(null);
  const [isDark,setIsDark]=useState(()=>{try{return localStorage.getItem("fitxp_theme")!=="light";}catch{return true;}});
  const [saveStatus,setSaveStatus]=useState("saved");
  const [xpPopups,setXpPopups]=useState([]);
  const [showAddModal,setShowAddModal]=useState(false);
  const [newHabit,setNewHabit]=useState({name:"",category:"Custom",xp:25,icon:"⭐",scheduleType:"daily",scheduleDays:[],timeOfDay:"morning"});
  const [editHabit,setEditHabit]=useState(null);
  const [showEditModal,setShowEditModal]=useState(false);
  const longPressTimer=useRef(null);
  const [activeTab,setActiveTab]=useState("habits");
  const [showConfetti,setShowConfetti]=useState(false);
  const [streakBanner,setStreakBanner]=useState(null);
  const [badgeToast,setBadgeToast]=useState([]);
  const [notifBanner,setNotifBanner]=useState(null);
  const [notifEnabled,setNotifEnabled]=useState(()=>{try{return localStorage.getItem("fitxp_notif")==="1";}catch{return false;}});
  const [showLootBox,setShowLootBox]=useState(false);
  const [xpBarKey,setXpBarKey]=useState(0);
  const prevRankRef=useRef(null);
  const popupCounter=useRef(0);
  const saveTimer=useRef(null);
  const lootBoxShownRef=useRef(false);

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth, async user=>{
      if(user){
        localStorage.setItem("fitxp_user_id", user.uid);
        const savedEmail = localStorage.getItem("fitxp_session_email");
        if(savedEmail && !appData){
          try{
            const snap = await getDoc(doc(db,"users",user.uid));
            if(snap.exists()){
              handleLogin(savedEmail, snap.data(), false, null, null, user.uid);
            }
          }catch(err){
          }
        }
      }
    });
    return ()=>unsub();
  },[]);
  const TH=getTheme(isDark);
  const activeEvent=getActiveEvent();

  function showNotif(msg){setNotifBanner(msg);setTimeout(()=>setNotifBanner(null),4000);}

  function handleLogin(email, existingData, isNew, chosenUsername, chosenAvatar, userId) {
    localStorage.setItem("fitxp_session_email",email);
    if(userId) localStorage.setItem("fitxp_user_id",userId);
    setUserEmail(email);
    let data=existingData||{xp:0,habits:DEFAULT_HABITS,streak:0,lastVisit:"",badges:[],totalHabitsCompleted:0,totalMissionsCompleted:0,totalLootOpened:0,bestStreak:0,xpHistory:{},missionsCompletedByDate:{},username:chosenUsername||email.split("@")[0],avatar:chosenAvatar||"⚔️"};
    if(!data.badges)data={...data,badges:[]};
    if(!data.xpHistory)data={...data,xpHistory:{}};
    if(!data.missionsCompletedByDate)data={...data,missionsCompletedByDate:{}};
    if(!data.avatar)data={...data,avatar:"⚔️"};
    const today=getTodayStr();
    if(data.lastVisit!==today){
      const diffDays=data.lastVisit?Math.round((new Date(today)-new Date(data.lastVisit))/86400000):0;
      const newStreak=diffDays===1?data.streak+1:1;
      data={...data,streak:newStreak,lastVisit:today,habits:data.habits.map(h=>({...h,completedToday:false})),bestStreak:Math.max(data.bestStreak||0,newStreak)};
      setStreakBanner({streak:newStreak,firstEver:isNew});
      setTimeout(()=>setStreakBanner(null),3500);
    }
    const {rank}=getRank(data.xp);
    prevRankRef.current=rank.name;
    const {updatedBadges,newBadges}=checkAchievements(data);
    if(newBadges.length>0){data={...data,badges:updatedBadges};newBadges.forEach((bid,i)=>setTimeout(()=>setBadgeToast(prev=>[...prev,bid]),i*800));}
    setAppData(data);
    if(isNew)setShowOnboarding(true);
    lootBoxShownRef.current=false;
  }

  useEffect(()=>{
    if(!appData||!userEmail)return;
    setSaveStatus("saving");
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      try{
        const userId=localStorage.getItem("fitxp_user_id");
        if(userId){ 
          await setDoc(doc(db,"users",userId),appData);
        } else {
        }
        setSaveStatus("saved");
      }
      catch(err){
        setSaveStatus("error");
      }
    },800);
  },[appData,userEmail]);

  useEffect(()=>{
    if(!appData)return;
    const today=getTodayStr();
    const dow=new Date().getDay();
    const date=new Date().getDate();
    const scheduled=appData.habits.filter(h=>{
      if(!h.scheduleType||h.scheduleType==="daily") return true;
      if(h.scheduleType==="weekly") return (h.scheduleDays||[]).includes(dow);
      if(h.scheduleType==="monthly") return (h.scheduleDays||[]).includes(date);
      return true;
    });
    const allDone=scheduled.length>0&&scheduled.every(h=>h.completedToday);
    if(allDone&&appData.lootBoxOpenedDate!==today&&!lootBoxShownRef.current){
      lootBoxShownRef.current=true;
      setTimeout(()=>setShowLootBox(true),600);
    }
  },[appData]);

  function signOut(){
    localStorage.removeItem("fitxp_session_email");
    localStorage.removeItem("fitxp_user_id");
    firebaseSignOut(auth).catch(()=>{});
    setUserEmail(null);
    setAppData(null);
  }
  function updateData(updater){setAppData(prev=>({...prev,...updater(prev)}));}

  function awardXP(amount,source) {
    const today=getTodayStr();
    const mult=activeEvent?activeEvent.mult:1;
    const finalAmount=source==="loot"?amount:Math.round(amount*mult);
    popupCounter.current+=1;
    const pid=popupCounter.current;
    setXpPopups(prev=>[...prev,{id:pid,amount:finalAmount}]);
    setTimeout(()=>setXpPopups(prev=>prev.filter(p=>p.id!==pid)),1600);
    setXpBarKey(k=>k+1);
    updateData(prev=>{
      const newXp=prev.xp+finalAmount;
      const xpHistory={...prev.xpHistory,[today]:(prev.xpHistory[today]||0)+finalAmount};
      const newData={...prev,xp:newXp,xpHistory};
      const newRankName=getRank(newXp).rank.name;
      if(newRankName!==prevRankRef.current){
        setShowConfetti(true);haptic([100,50,100,50,200]);
        prevRankRef.current=newRankName;
      }
      const {updatedBadges,newBadges}=checkAchievements(newData);
      if(newBadges.length>0)newBadges.forEach((bid,i)=>setTimeout(()=>setBadgeToast(p=>[...p,bid]),i*800));
      return{...newData,badges:updatedBadges};
    });
  }

  function completeHabit(id) {
    const habit=appData.habits.find(h=>h.id===id);
    if(!habit||habit.completedToday)return;
    haptic([20]);
    const bonus=appData.streak>=3?Math.floor(habit.xp*.2):0;
    const gained=habit.xp+bonus;
    updateData(prev=>{
      const newHabits=prev.habits.map(h=>h.id===id?{...h,completedToday:true}:h);
      const newTotal=(prev.totalHabitsCompleted||0)+1;
      return{...prev,habits:newHabits,totalHabitsCompleted:newTotal};
    });
    awardXP(gained,"habit");
  }

  function handleMissionComplete(m){
    const today=getTodayStr();
    updateData(prev=>{
      const map=prev.missionsCompletedByDate||{};
      const td=map[today]||[];
      if(td.includes(m.id))return prev;
      return{...prev,missionsCompletedByDate:{...map,[today]:[...td,m.id]},totalMissionsCompleted:(prev.totalMissionsCompleted||0)+1};
    });
    awardXP(m.xp,"mission");
    showNotif(`Mission complete: ${m.name}! +${m.xp} XP`);
  }

  function handleLootOpen(reward){
    setShowLootBox(false);
    awardXP(reward.amount,"loot");
    updateData(prev=>{
      const n=(prev.totalLootOpened||0)+1;
      const nd={...prev,lootBoxOpenedDate:getTodayStr(),totalLootOpened:n};
      const {updatedBadges,newBadges}=checkAchievements(nd);
      if(newBadges.length>0)newBadges.forEach((bid,i)=>setTimeout(()=>setBadgeToast(p=>[...p,bid]),i*800));
      return{...nd,badges:updatedBadges};
    });
  }

  function startLongPress(habit){
  longPressTimer.current=setTimeout(()=>{
    haptic([30,20,30]);
    setEditHabit({...habit});
    setShowEditModal(true);
  },600);
  }
  function endLongPress(){
    if(longPressTimer.current) clearTimeout(longPressTimer.current);
  }
  function saveEditHabit(){
    if(!editHabit.name.trim()) return;
    updateData(prev=>({habits:prev.habits.map(h=>h.id===editHabit.id?{...editHabit}:h)}));
    setShowEditModal(false);
    setEditHabit(null);
    showNotif("Habit updated! ✓");
  }

  function addHabit(){if(!newHabit.name.trim())return;updateData(prev=>({habits:[...prev.habits,{...newHabit,id:Date.now(),completedToday:false}]}));setNewHabit({name:"",category:"Custom",xp:25,icon:"⭐",scheduleType:"daily",scheduleDays:[],timeOfDay:"morning"});setShowAddModal(false);}
  function removeHabit(id){updateData(prev=>({habits:prev.habits.filter(h=>h.id!==id)}));}

  async function enableNotifications(){
    if(!("Notification" in window)){showNotif("Notifications not supported here");return;}
    const perm=await Notification.requestPermission();
    if(perm==="granted"){localStorage.setItem("fitxp_notif","1");setNotifEnabled(true);showNotif("Notifications enabled! 🔔");new Notification("FitQuest XP",{body:"Daily reminders are now active! 🔥"});}
    else showNotif("Permission denied.");
  }

  if(showSplash) return <SplashScreen onDone={()=>setShowSplash(false)}/>;
  if(showOnboarding&&appData) return <OnboardingScreen onDone={()=>setShowOnboarding(false)} TH={TH}/>;
  if(!userEmail||!appData) return <LoginScreen onLogin={handleLogin}/>;

  const {xp,habits,streak:dailyStreak,badges,avatar}=appData;
  const {rank,index:rankIndex}=getRank(xp);
  const nextRank=RANKS[rankIndex+1];

  // Filter habits that should appear today based on schedule
  const todayDow = new Date().getDay(); // 0=Sun ... 6=Sat
  const todayDate = new Date().getDate(); // 1-31
  function habitScheduledToday(h) {
    if(!h.scheduleType||h.scheduleType==="daily") return true;
    if(h.scheduleType==="weekly") return (h.scheduleDays||[]).includes(todayDow);
    if(h.scheduleType==="monthly") return (h.scheduleDays||[]).includes(todayDate);
    return true;
  }
  const todayHabits = habits.filter(habitScheduledToday);

  const completedCount=todayHabits.filter(h=>h.completedToday).length;
  const totalXpAvailable=todayHabits.filter(h=>!h.completedToday).reduce((s,h)=>s+h.xp,0);

  const TABS=[
    {id:"habits",   icon:"💪", name:"Habits"},
    {id:"missions", icon:"🎯", name:"Missions"},
    {id:"badges",   icon:"🏆", name:"Badges"},
    {id:"reports",  icon:"📊", name:"Reports"},
    {id:"ranks",    icon:"🪨", name:"Ranks"},
    {id:"friends",  icon:"👥", name:"Friends"},
    {id:"global",   icon:"🌍", name:"Global"},
    {id:"settings", icon:"⚙️", name:"Settings"},
  ];

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');
    @keyframes xpFloat{0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}50%{opacity:1;transform:translateX(-50%) translateY(-60px) scale(1.2)}100%{opacity:0;transform:translateX(-50%) translateY(-120px) scale(.8)}}
    @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,.4)}50%{box-shadow:0 0 0 8px rgba(255,215,0,0)}}
    @keyframes xpBarFill{from{opacity:.7;filter:brightness(1.5)}to{opacity:1;filter:brightness(1)}}
    @keyframes xpBarPulse{0%{box-shadow:0 0 0 0 rgba(255,215,0,.8)}100%{box-shadow:0 0 15px 4px rgba(255,215,0,0)}}
    @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes bgPulse{0%,100%{opacity:.03}50%{opacity:.06}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes slideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes bannerSlide{0%{opacity:0;transform:translateY(-60px)}15%{opacity:1;transform:translateY(0)}80%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-60px)}}
    @keyframes toastSlide{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
    @keyframes lootBounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-12px) scale(1.05)}}
    @keyframes lootShake{0%{transform:rotate(0deg)}15%{transform:rotate(-8deg)}30%{transform:rotate(8deg)}45%{transform:rotate(-6deg)}60%{transform:rotate(6deg)}75%{transform:rotate(-3deg)}90%{transform:rotate(3deg)}100%{transform:rotate(0deg)}}
    @keyframes fadeIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
    @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes eventPulse{0%,100%{opacity:1}50%{opacity:.7}}
    .habit-card{background:${TH.habitCard};border:1px solid ${TH.border};border-radius:12px;padding:15px;margin-bottom:10px;display:flex;align-items:center;gap:14px;transition:all .25s ease;animation:slideIn .3s ease forwards;cursor:pointer;position:relative;overflow:hidden;}
    .habit-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,.2),transparent);}
    .habit-card:hover:not(.completed){border-color:${isDark?"#333":"#bbb"};transform:translateX(4px);}
    .habit-card.completed{opacity:.55;border-color:${isDark?"#1e2e1e":"#d0ead0"};background:${isDark?"linear-gradient(135deg,#0d140d,#0a100a)":"linear-gradient(135deg,#f0fff0,#e8fce8)"};}
    .complete-btn{width:40px;height:40px;border-radius:50%;border:2px solid ${TH.border};background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:all .2s ease;flex-shrink:0;color:${TH.text};}
    .complete-btn:hover{border-color:#4CAF50;background:rgba(76,175,80,.15);transform:scale(1.1);}
    .complete-btn.done{border-color:#4CAF50;background:rgba(76,175,80,.2);animation:pulse 2s infinite;}
    .xp-badge{background:linear-gradient(135deg,#1a1400,#2a2000);border:1px solid #333;border-radius:20px;padding:3px 10px;font-size:.72rem;font-family:'Orbitron',monospace;color:#FFD700;flex-shrink:0;}
    .tab-btn{background:none;border:none;padding:8px 10px;color:${TH.textFaint};font-family:'Orbitron',monospace;font-size:.52rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;transition:all .25s ease;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:4px;}
    .tab-btn.active{color:#FFD700;border-bottom-color:#FFD700;background:rgba(255,215,0,.06);border-radius:6px 6px 0 0;padding:8px 12px;}
    .action-btn{background:linear-gradient(135deg,#1a1400,#2a2000);border:1px solid #FFD700;color:#FFD700;padding:10px 20px;border-radius:8px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.9rem;cursor:pointer;text-transform:uppercase;letter-spacing:1px;transition:all .2s ease;}
    .action-btn:hover{background:linear-gradient(135deg,#2a2000,#3a3000);box-shadow:0 0 15px rgba(255,215,0,.3);}
    .action-btn.danger{border-color:#FF4444;color:#FF4444;background:linear-gradient(135deg,#1a0000,#2a0000);}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:flex-start;justify-content:center;z-index:1000;backdrop-filter:blur(4px);overflow-y:auto;padding:20px 0;}
    .modal{background:${TH.modalBg};border:1px solid ${TH.border};border-radius:16px;padding:28px;width:90%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.8);margin:auto;}
    .modal input,.modal select{width:100%;background:${TH.inputBg};border:1px solid ${TH.border2};color:${TH.text};padding:10px 14px;border-radius:8px;font-family:'Rajdhani',sans-serif;font-size:1rem;margin-bottom:12px;outline:none;box-sizing:border-box;transition:border-color .2s;}
    .modal input:focus,.modal select:focus{border-color:#FFD700;}
    .modal select option{background:${TH.modalBg};}
    .rank-card{border-radius:12px;padding:16px;margin-bottom:10px;display:flex;align-items:center;gap:14px;position:relative;overflow:hidden;}
    .progress-bar-container{width:100%;height:8px;background:${TH.border};border-radius:4px;overflow:hidden;}
    .progress-bar-fill{height:100%;border-radius:4px;position:relative;}
    .progress-bar-fill::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);animation:shimmer 2s infinite;background-size:200% 100%;}
    .stat-box{background:${TH.statBox};border:1px solid ${TH.border};border-radius:12px;padding:14px;text-align:center;flex:1;}
    .icon-btn{background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;color:${TH.textFaint};font-size:.85rem;transition:all .2s;}
    .icon-btn:hover{color:#FF4444;background:rgba(255,68,68,.1);}
    .bg-grid{position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(${TH.gridColor} 1px,transparent 1px),linear-gradient(90deg,${TH.gridColor} 1px,transparent 1px);background-size:40px 40px;animation:bgPulse 4s ease-in-out infinite;}
    .streak-banner{position:fixed;top:0;left:0;right:0;z-index:3000;text-align:center;padding:12px 20px;background:linear-gradient(135deg,#1a1000,#0a0800);border-bottom:1px solid #FF6B35;box-shadow:0 4px 30px rgba(255,107,53,.3);animation:bannerSlide 3.5s ease forwards;font-family:'Orbitron',monospace;}
    .tabs-scroll{display:flex;overflow-x:auto;border-bottom:1px solid ${TH.border};margin-bottom:14px;scrollbar-width:none;}
    .tabs-scroll::-webkit-scrollbar{display:none;}
  `;

  return (
    <div style={{minHeight:"100vh",background:TH.bg,fontFamily:"'Rajdhani','Segoe UI',sans-serif",color:TH.text,position:"relative",overflow:"hidden"}}>
      <style>{CSS}</style>
      <div className="bg-grid"/>

      {showConfetti&&<Confetti onDone={()=>setShowConfetti(false)}/>}
      {notifBanner&&<NotifBanner msg={notifBanner} onDone={()=>setNotifBanner(null)}/>}
      {badgeToast.length>0&&<AchievementToast badge={badgeToast[0]} onDone={()=>setBadgeToast(prev=>prev.slice(1))}/>}
      {showLootBox&&<LootBoxModal onOpen={handleLootOpen} onClose={()=>setShowLootBox(false)}/>}
      {streakBanner&&(
        <div className="streak-banner">
          <span style={{fontSize:"1.2rem"}}>🔥</span>
          <span style={{color:"#FF6B35",fontWeight:700,fontSize:".95rem",marginLeft:8}}>{streakBanner.firstEver?"Welcome! Day 1 streak started!":streakBanner.streak===1?"Streak reset — Day 1. Don't miss tomorrow!":`Day ${streakBanner.streak} streak! Keep it up!`}</span>
          {streakBanner.streak>=3&&<span style={{color:"#FFD700",fontSize:".7rem",marginLeft:10}}>+20% XP BONUS!</span>}
        </div>
      )}
      {xpPopups.map(p=><XPPopup key={p.id} id={p.id} amount={p.amount}/>)}

      {showEditModal&&editHabit&&(
        <div className="modal-overlay" onClick={()=>setShowEditModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:"'Cinzel Decorative',serif",color:"#FFD700",marginBottom:18,fontSize:"1.1rem"}}>✏️ Edit Habit</h2>
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Habit Name</label>
            <input placeholder="e.g. 20 Sit-ups" value={editHabit.name} onChange={e=>setEditHabit(p=>({...p,name:e.target.value}))}/>
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Icon (emoji)</label>
            <input placeholder="⭐" value={editHabit.icon} onChange={e=>setEditHabit(p=>({...p,icon:e.target.value}))}/>
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Category</label>
            <select value={editHabit.category} onChange={e=>setEditHabit(p=>({...p,category:e.target.value}))}>
              {Object.keys(CATEGORY_COLORS).map(c=><option key={c}>{c}</option>)}
            </select>
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>XP Reward: {editHabit.xp}</label>
            <input type="range" min="5" max="100" step="5" value={editHabit.xp} onChange={e=>setEditHabit(p=>({...p,xp:parseInt(e.target.value)}))} style={{accentColor:"#FFD700",width:"100%",marginBottom:14}}/>

            {/* Time of Day */}
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Time of Day</label>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[{id:"morning",icon:"🌅",label:"Morning"},{id:"afternoon",icon:"☀️",label:"Afternoon"},{id:"night",icon:"🌙",label:"Night"}].map(t=>(
                <button key={t.id} onClick={()=>setEditHabit(p=>({...p,timeOfDay:t.id}))} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1px solid ${editHabit.timeOfDay===t.id?"#FFD700":TH.border2}`,background:editHabit.timeOfDay===t.id?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",color:editHabit.timeOfDay===t.id?"#FFD700":TH.textFaint,fontFamily:"'Orbitron',monospace",fontSize:".5rem",cursor:"pointer",textTransform:"uppercase",letterSpacing:"1px",transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:"1rem"}}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Schedule */}
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Schedule</label>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {["daily","weekly","monthly"].map(t=>(
                <button key={t} onClick={()=>setEditHabit(p=>({...p,scheduleType:t,scheduleDays:[]}))} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1px solid ${editHabit.scheduleType===t?"#FFD700":TH.border2}`,background:editHabit.scheduleType===t?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",color:editHabit.scheduleType===t?"#FFD700":TH.textFaint,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",textTransform:"uppercase",letterSpacing:"1px",transition:"all .2s"}}>
                  {t}
                </button>
              ))}
            </div>

            {editHabit.scheduleType==="weekly"&&(
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".8rem",color:TH.textMuted,marginBottom:6}}>Pick which days of the week:</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>{
                    const sel=(editHabit.scheduleDays||[]).includes(i);
                    return (
                      <button key={d} onClick={()=>setEditHabit(p=>({...p,scheduleDays:sel?p.scheduleDays.filter(x=>x!==i):[...(p.scheduleDays||[]),i]}))}
                        style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${sel?"#FFD700":TH.border2}`,background:sel?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",color:sel?"#FFD700":TH.textMuted,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",transition:"all .15s"}}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {editHabit.scheduleType==="monthly"&&(
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".8rem",color:TH.textMuted,marginBottom:6}}>Pick which days of the month:</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,maxHeight:140,overflowY:"auto"}}>
                  {Array.from({length:31},(_,i)=>i+1).map(day=>{
                    const sel=(editHabit.scheduleDays||[]).includes(day);
                    return (
                      <button key={day} onClick={()=>setEditHabit(p=>({...p,scheduleDays:sel?p.scheduleDays.filter(x=>x!==day):[...(p.scheduleDays||[]),day]}))}
                        style={{padding:"5px 2px",borderRadius:6,border:`1px solid ${sel?"#FFD700":TH.border2}`,background:sel?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",color:sel?"#FFD700":TH.textMuted,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",transition:"all .15s",textAlign:"center"}}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button className="action-btn" style={{flex:1}} onClick={saveEditHabit}>Save Changes</button>
              <button className="action-btn danger" onClick={()=>setShowEditModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal&&(
        <div className="modal-overlay" onClick={()=>setShowAddModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:"'Cinzel Decorative',serif",color:"#FFD700",marginBottom:18,fontSize:"1.1rem"}}>Add New Habit</h2>
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Habit Name</label>
            <input placeholder="e.g. 20 Sit-ups" value={newHabit.name} onChange={e=>setNewHabit(p=>({...p,name:e.target.value}))}/>
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Icon (emoji)</label>
            <input placeholder="⭐" value={newHabit.icon} onChange={e=>setNewHabit(p=>({...p,icon:e.target.value}))}/>
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Category</label>
            <select value={newHabit.category} onChange={e=>setNewHabit(p=>({...p,category:e.target.value}))}>
              {Object.keys(CATEGORY_COLORS).map(c=><option key={c}>{c}</option>)}
            </select>
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>XP Reward: {newHabit.xp}</label>
            <input type="range" min="5" max="100" step="5" value={newHabit.xp} onChange={e=>setNewHabit(p=>({...p,xp:parseInt(e.target.value)}))} style={{accentColor:"#FFD700",width:"100%",marginBottom:14}}/>

            {/* Schedule Picker */}
            <label style={{display:"block",color:TH.textMuted,fontSize:".75rem",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Time of Day</label>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[{id:"morning",icon:"🌅",label:"Morning"},{id:"afternoon",icon:"☀️",label:"Afternoon"},{id:"night",icon:"🌙",label:"Night"}].map(t=>(
                <button key={t.id} onClick={()=>setNewHabit(p=>({...p,timeOfDay:t.id}))} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1px solid ${newHabit.timeOfDay===t.id?"#FFD700":TH.border2}`,background:newHabit.timeOfDay===t.id?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",color:newHabit.timeOfDay===t.id?"#FFD700":TH.textFaint,fontFamily:"'Orbitron',monospace",fontSize:".5rem",cursor:"pointer",textTransform:"uppercase",letterSpacing:"1px",transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:"1rem"}}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {["daily","weekly","monthly"].map(t=>(
                <button key={t} onClick={()=>setNewHabit(p=>({...p,scheduleType:t,scheduleDays:[]}))} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1px solid ${newHabit.scheduleType===t?"#FFD700":TH.border2}`,background:newHabit.scheduleType===t?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",color:newHabit.scheduleType===t?"#FFD700":TH.textFaint,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",textTransform:"uppercase",letterSpacing:"1px",transition:"all .2s"}}>
                  {t}
                </button>
              ))}
            </div>

            {newHabit.scheduleType==="weekly"&&(
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".8rem",color:TH.textMuted,marginBottom:6}}>Pick which days of the week:</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>{
                    const sel=(newHabit.scheduleDays||[]).includes(i);
                    return (
                      <button key={d} onClick={()=>setNewHabit(p=>({...p,scheduleDays:sel?p.scheduleDays.filter(x=>x!==i):[...(p.scheduleDays||[]),i]}))}
                        style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${sel?"#FFD700":TH.border2}`,background:sel?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",color:sel?"#FFD700":TH.textMuted,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",transition:"all .15s"}}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {newHabit.scheduleType==="monthly"&&(
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".8rem",color:TH.textMuted,marginBottom:6}}>Pick which days of the month:</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,maxHeight:140,overflowY:"auto"}}>
                  {Array.from({length:31},(_,i)=>i+1).map(day=>{
                    const sel=(newHabit.scheduleDays||[]).includes(day);
                    return (
                      <button key={day} onClick={()=>setNewHabit(p=>({...p,scheduleDays:sel?p.scheduleDays.filter(x=>x!==day):[...(p.scheduleDays||[]),day]}))}
                        style={{padding:"5px 2px",borderRadius:6,border:`1px solid ${sel?"#FFD700":TH.border2}`,background:sel?"linear-gradient(135deg,#1a1400,#2a2000)":"transparent",color:sel?"#FFD700":TH.textMuted,fontFamily:"'Orbitron',monospace",fontSize:".55rem",cursor:"pointer",transition:"all .15s",textAlign:"center"}}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button className="action-btn" style={{flex:1}} onClick={addHabit}>Add Habit</button>
              <button className="action-btn danger" onClick={()=>setShowAddModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:480,margin:"0 auto",padding:"16px 14px"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:14,paddingTop:streakBanner?50:8}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:".6rem",color:TH.textFaint,letterSpacing:"4px",textTransform:"uppercase",marginBottom:4}}>Daily Quest Log</div>
          <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.6rem",margin:0,background:"linear-gradient(135deg,#FFD700 0%,#FF6B35 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>FitQuest XP</h1>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,background:TH.card,border:`1px solid ${TH.border}`,borderRadius:20,padding:"3px 10px"}}>
              <span style={{fontSize:".9rem"}}>{avatar||"⚔️"}</span>
              <span style={{fontSize:".72rem",color:TH.textMuted,fontFamily:"'Rajdhani',sans-serif",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appData.username||userEmail}</span>
              <span style={{fontSize:".55rem",color:saveStatus==="saved"?"#4CAF50":saveStatus==="saving"?"#FFD700":"#FF4444",fontFamily:"'Orbitron',monospace",letterSpacing:"1px"}}>{saveStatus==="saved"?"✓":saveStatus==="saving"?"↑":"⚠"}</span>
            </div>
          </div>
        </div>

        {/* XP Event Banner */}
        {activeEvent&&(
          <div style={{background:`linear-gradient(135deg,${activeEvent.color}20,${activeEvent.color}10)`,border:`1px solid ${activeEvent.color}60`,borderRadius:10,padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",animation:"eventPulse 2s ease infinite"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:"1.2rem"}}>{activeEvent.icon}</span>
              <div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:activeEvent.color,letterSpacing:"1px"}}>{activeEvent.label.toUpperCase()}</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".78rem",color:TH.textMuted}}>All XP ×{activeEvent.mult} today!</div>
              </div>
            </div>
            <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.2rem",color:activeEvent.color,textShadow:`0 0 15px ${activeEvent.color}`}}>×{activeEvent.mult}</div>
          </div>
        )}

        {/* Rank Banner */}
        <div style={{background:`linear-gradient(135deg,${rank.bg},${TH.card2})`,border:`1px solid ${rank.color}40`,borderRadius:16,padding:"16px",marginBottom:12,boxShadow:`0 0 30px ${rank.glow}15`,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-10,fontSize:"5rem",opacity:.07}}>{rank.icon}</div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{fontSize:"2.2rem",animation:"float 3s ease-in-out infinite"}}>{rank.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:"#666",letterSpacing:"2px",textTransform:"uppercase"}}>Rank</div>
              <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1.4rem",color:rank.color,textShadow:`0 0 20px ${rank.glow}`}}>{rank.name}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:".58rem",color:"#666",letterSpacing:"2px"}}>TOTAL XP</div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"1.3rem",color:"#FFD700",fontWeight:900}}>{xp.toLocaleString()}</div>
            </div>
          </div>
          {/* Animated XP Bar */}
          {nextRank?(
            <>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:".52rem",color:"#555"}}>
                  {xp.toLocaleString()} / {nextRank.minXP.toLocaleString()} XP
                </span>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:".52rem",color:rank.color}}>→ {nextRank.name} {nextRank.icon}</span>
              </div>
              <div className="progress-bar-container">
                <div key={xpBarKey} className="progress-bar-fill" style={{width:`${Math.min(100,((xp-rank.minXP)/(nextRank.minXP-rank.minXP))*100)}%`,background:`linear-gradient(90deg,${rank.color}80,${rank.color})`,boxShadow:`0 0 10px ${rank.glow}`,transition:"width .8s cubic-bezier(.34,1.56,.64,1)",animation:"xpBarPulse .6s ease-out"}}/>
              </div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:".42rem",color:TH.textFaint,marginTop:4,textAlign:"right",letterSpacing:"1px"}}>{Math.round(Math.min(100,((xp-rank.minXP)/(nextRank.minXP-rank.minXP))*100))}% to {nextRank.name}</div>
            </>
          ):<div style={{textAlign:"center",color:rank.color,fontFamily:"'Cinzel Decorative',serif",fontSize:".85rem"}}>✨ Maximum Rank Achieved ✨</div>}
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <div className="stat-box"><div style={{fontFamily:"'Orbitron',monospace",fontSize:".48rem",color:TH.textFaint,letterSpacing:"2px",marginBottom:2}}>DONE</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:"1.25rem",color:"#4CAF50",fontWeight:700}}>{completedCount}/{todayHabits.length}</div></div>
          <div className="stat-box"><div style={{fontFamily:"'Orbitron',monospace",fontSize:".48rem",color:TH.textFaint,letterSpacing:"2px",marginBottom:2}}>XP LEFT</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:"1.25rem",color:"#FFD700",fontWeight:700}}>+{totalXpAvailable}</div></div>
          <div className="stat-box" style={{border:dailyStreak>=3?"1px solid #FF6B3560":`1px solid ${TH.border}`,background:dailyStreak>=3?"linear-gradient(135deg,#1a0800,#0d0d14)":TH.statBox}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:".48rem",color:TH.textFaint,letterSpacing:"2px",marginBottom:2}}>STREAK</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"1.25rem",color:"#FF6B35",fontWeight:700}}>{dailyStreak}🔥</div>
            {dailyStreak>=3&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:".38rem",color:"#FFD700",letterSpacing:"1px"}}>+20%</div>}
          </div>
          <div className="stat-box"><div style={{fontFamily:"'Orbitron',monospace",fontSize:".48rem",color:TH.textFaint,letterSpacing:"2px",marginBottom:2}}>BADGES</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:"1.25rem",color:"#9B59B6",fontWeight:700}}>{(badges||[]).length}🏅</div></div>
        </div>

        {/* Tabs */}
        <div className="tabs-scroll">
          {TABS.map(t=>(
            <button key={t.id} className={`tab-btn ${activeTab===t.id?"active":""}`} onClick={()=>setActiveTab(t.id)}>
              <span style={{fontSize:"1rem"}}>{t.icon}</span>
              {activeTab===t.id&&<span style={{fontSize:".5rem",letterSpacing:"1px"}}>{t.name}</span>}
            </button>
          ))}
        </div>

        {/* Habits Tab */}
        {activeTab==="habits"&&(
          <>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button className="action-btn" style={{flex:1}} onClick={()=>setShowAddModal(true)}>+ Add Habit</button>
            </div>
            {todayHabits.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:TH.textFaint}}><div style={{fontSize:"3rem",marginBottom:10}}>🎯</div><div>{habits.length===0?"No habits yet!":"No habits scheduled for today!"}</div></div>}
            {[{id:"morning",icon:"🌅",label:"Morning"},{id:"afternoon",icon:"☀️",label:"Afternoon"},{id:"night",icon:"🌙",label:"Night"}].map(section=>{
              const sectionHabits=todayHabits.filter(h=>(h.timeOfDay||"morning")===section.id);
              if(sectionHabits.length===0) return null;
              return (
                <div key={section.id}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,marginTop:10}}>
                    <span style={{fontSize:"1.1rem"}}>{section.icon}</span>
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,letterSpacing:"2px",textTransform:"uppercase"}}>{section.label}</span>
                    <div style={{flex:1,height:1,background:TH.border}}/>
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:".48rem",color:TH.textFaint}}>{sectionHabits.filter(h=>h.completedToday).length}/{sectionHabits.length}</span>
                  </div>
                  {sectionHabits.map((habit,i)=>(
                  <div key={habit.id} className={`habit-card ${habit.completedToday?"completed":""}`} style={{animationDelay:`${i*.05}s`,opacity:0,animationFillMode:"forwards"}}
                  onClick={()=>completeHabit(habit.id)}
                  onMouseDown={()=>startLongPress(habit)}
                  onMouseUp={endLongPress}
                  onMouseLeave={endLongPress}
                  onTouchStart={()=>startLongPress(habit)}
                  onTouchEnd={endLongPress}
                  onTouchMove={endLongPress}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:CATEGORY_COLORS[habit.category]||"#666",borderRadius:"12px 0 0 12px",opacity:habit.completedToday?.4:.8}}/>
                <button className={`complete-btn ${habit.completedToday?"done":""}`} onClick={e=>{e.stopPropagation();completeHabit(habit.id);}}>{habit.completedToday?"✓":"○"}</button>
                <div style={{fontSize:"1.5rem",flexShrink:0}}>{habit.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:".95rem",color:habit.completedToday?TH.textFaint:TH.text,textDecoration:habit.completedToday?"line-through":"none",fontFamily:"'Rajdhani',sans-serif"}}>{habit.name}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginTop:2}}>
                    <span style={{fontSize:".62rem",color:CATEGORY_COLORS[habit.category]||"#666",fontFamily:"'Orbitron',monospace",letterSpacing:"1px"}}>{habit.category}</span>
                    {dailyStreak>=3&&!habit.completedToday&&<span style={{fontSize:".58rem",color:"#FFD700",fontFamily:"'Orbitron',monospace"}}>+BONUS</span>}
                    {activeEvent&&!habit.completedToday&&<span style={{fontSize:".58rem",color:activeEvent.color,fontFamily:"'Orbitron',monospace"}}>×{activeEvent.mult}</span>}
                    {habit.scheduleType==="weekly"&&<span style={{fontSize:".55rem",color:TH.textFaint,fontFamily:"'Orbitron',monospace"}}>📅 {(habit.scheduleDays||[]).map(d=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")}</span>}
                    {habit.scheduleType==="monthly"&&<span style={{fontSize:".55rem",color:TH.textFaint,fontFamily:"'Orbitron',monospace"}}>📅 Day {(habit.scheduleDays||[]).join(", ")} of month</span>}
                  </div>
                </div>
                <div className="xp-badge">
                  +{Math.round((dailyStreak>=3?Math.floor(habit.xp*1.2):habit.xp)*(activeEvent?activeEvent.mult:1))}
                </div>
                <button className="icon-btn" onClick={e=>{e.stopPropagation();removeHabit(habit.id);}}>✕</button>
                  </div>
                  ))}
                </div>
              );
            })}
            {habits.length>0&&completedCount<habits.length&&(
              <div style={{marginTop:8,padding:"10px 14px",background:TH.card2,borderRadius:8,border:`1px solid ${TH.border}`}}>
                <div style={{fontSize:".62rem",color:TH.textFaint,fontFamily:"'Orbitron',monospace",letterSpacing:"1px"}}>📦 Complete ALL habits to unlock a Loot Box!</div>
              </div>
            )}
          </>
        )}

        {activeTab==="missions"&&<MissionsTab habits={habits} appData={appData} onMissionComplete={handleMissionComplete} TH={TH}/>}
        {activeTab==="badges"&&<AchievementsTab badges={badges||[]} TH={TH}/>}
        {activeTab==="reports"&&<ReportsTab appData={appData} TH={TH}/>}

        {/* Ranks Tab */}
        {activeTab==="ranks"&&(
          <div>
            {RANKS.map(r=>{
              const isCurrentRank=r.name===rank.name;
              const isUnlocked=xp>=r.minXP;
              return (
                <div key={r.name} className="rank-card" style={{background:isCurrentRank?`linear-gradient(135deg,${r.bg},${TH.card2})`:isUnlocked?TH.rankCardUnlocked:TH.card2,border:`1px solid ${isCurrentRank?r.color+"60":TH.border}`,boxShadow:isCurrentRank?`0 0 20px ${r.glow}20`:"none",marginBottom:6}}>
                  {isCurrentRank&&<div style={{position:"absolute",top:6,right:8,fontFamily:"'Orbitron',monospace",fontSize:".5rem",color:r.color,letterSpacing:"2px"}}>◄ YOU</div>}
                  <div style={{position:"relative",flexShrink:0}}>
                    <div style={{fontSize:"1.7rem",filter:isUnlocked?"none":"grayscale(100%) brightness(.3)"}}>{r.icon}</div>
                    {!isUnlocked&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem"}}>🔒</div>}
                  </div>
                  <div style={{flex:1,opacity:isUnlocked?1:.4}}>
                    <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:"1rem",color:isUnlocked?r.color:"#333",textShadow:isCurrentRank?`0 0 15px ${r.glow}`:"none"}}>{r.name}</div>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,marginTop:2}}>{r.minXP.toLocaleString()} {r.maxXP!==Infinity?`— ${r.maxXP.toLocaleString()} XP`:"+ XP"}</div>
                  </div>
                  {isUnlocked?<div style={{fontFamily:"'Orbitron',monospace",fontSize:".65rem",color:"#4CAF50"}}>✓ Unlocked</div>:<div style={{fontFamily:"'Orbitron',monospace",fontSize:".55rem",color:TH.textFaint,opacity:.5}}>{r.minXP.toLocaleString()} XP</div>}
                </div>
              );
            })}
          </div>
        )}

        {activeTab==="friends"&&<FriendsTab userEmail={userEmail} userXp={xp} userStreak={dailyStreak} username={appData.username||userEmail.split("@")[0]} avatar={avatar} TH={TH}/>}
        {activeTab==="global"&&<GlobalLeaderboardTab userEmail={userEmail} userXp={xp} userStreak={dailyStreak} username={appData.username||userEmail.split("@")[0]} avatar={avatar} TH={TH}/>}
        {activeTab==="settings"&&(
          <SettingsTab
            appData={appData} userEmail={userEmail} isDark={isDark}
            onToggleTheme={()=>{const n=!isDark;setIsDark(n);try{localStorage.setItem("fitxp_theme",n?"dark":"light");}catch{}}}
            notifEnabled={notifEnabled} onToggleNotif={()=>{if(notifEnabled){localStorage.removeItem("fitxp_notif");setNotifEnabled(false);showNotif("Notifications disabled.");}else enableNotifications();}}
            onAvatarChange={av=>{updateData(()=>({avatar:av}));showNotif(`Avatar updated to ${av}!`);}}
            onUsernameChange={un=>{updateData(()=>({username:un}));}}
            onSignOut={signOut} showNotif={showNotif} TH={TH}
          />
        )}

      </div>
    </div>
  );
}