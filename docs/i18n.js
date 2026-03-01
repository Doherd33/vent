// ═══════════════════════════════════════════════════════════════════════════════
// VENT i18n — English / 中文 / Español
// ═══════════════════════════════════════════════════════════════════════════════
(function() {
  'use strict';

  const STORAGE_KEY = 'vent_lang';
  const DEFAULT_LANG = 'en';
  const SUPPORTED = ['en', 'zh', 'es'];

  // ── Inject switcher CSS ──
  const style = document.createElement('style');
  style.textContent = `
    .lang-switcher{display:inline-flex;gap:1px;background:var(--s3,#333337);border:1px solid var(--border,#3c3c3c);border-radius:5px;overflow:hidden;flex-shrink:0}
    .lang-btn{background:transparent;border:none;color:var(--dim,#5a5a5a);font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 8px;cursor:pointer;letter-spacing:.03em;transition:all .15s;line-height:1.4}
    .lang-btn:hover{color:var(--text,#ccc);background:rgba(255,255,255,.06)}
    .lang-btn.lang-active{color:#fff;background:var(--accent,#007acc)}
    .cine-lang-switcher{position:fixed;top:20px;right:20px;z-index:1001;opacity:0;animation:cineReveal .5s ease .5s forwards}
    .cine-lang-switcher .lang-switcher{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1)}
    .cine-lang-switcher .lang-btn{font-size:11px;padding:4px 10px}
  `;
  document.head.appendChild(style);

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSLATION DICTIONARIES
  // ═══════════════════════════════════════════════════════════════════════════
  const T = {
    // ─────────────────────────────────────────────────────────────────────────
    // ENGLISH
    // ─────────────────────────────────────────────────────────────────────────
    en: {
      // Navigation
      'nav.submit':       'Submit',
      'nav.query':        'Query SOPs',
      'nav.submissions':  'Submissions',
      'nav.docBuilder':   'Doc Builder',
      'nav.qaControl':    'QA Control',
      'nav.workflow':     'Workflow',
      'nav.dashboard':    'Dashboard',
      'nav.signOut':      'Sign out',

      // Cinematic intro
      'cine.subtitle':       'Manufacturing Intelligence',
      'cine.tagline':        'Designed for the floor.',
      'cine.enter':          'Enter Vent',
      'cine.voiceConnected': 'VOICE AI CONNECTED',
      'cine.voiceOffline':   'VOICE AI OFFLINE',

      // Login card
      'login.signInTab':      'Sign In',
      'login.registerTab':    'Register',
      'login.welcomeBack':    'Welcome back',
      'login.signInSub':      'Sign in with your email and password.',
      'login.email':          'Email',
      'login.password':       'Password',
      'login.emailPlaceholder': 'you@company.com',
      'login.passwordPlaceholder': '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',
      'login.signInBtn':      'Sign in',
      'login.showPassword':   'Show password',
      'login.privateAccess':  'Private Access',
      'login.privateMsg':     'Registration and access to Vent is <strong style="color:#fff;font-weight:400;">private</strong> for the time being.',
      'login.contactMsg':     'Please contact <strong style="color:var(--accent);font-weight:500;">Mr\u00a0Vent</strong> directly to request user access.',
      'login.backToSignIn':   'Back to Sign In',
      'login.footer':         'Anonymous by design. Intelligent by necessity.',

      // Login flow — registration steps
      'login.almostThere':  'Almost there',
      'login.detailsSub':   'Enter your details to start submitting observations.',
      'login.yourDept':     'Your department',
      'login.deptSub':      'Select your department and create your credentials.',
      'login.pleaseWait':   'Please wait\u2026',

      // Login errors
      'err.emailPassword':     'Please enter your email and password.',
      'err.signInFailed':      'Sign in failed.',
      'err.serverUnreachable': 'Unable to reach server. Please try again.',
      'err.selectDept':        'Please select your department.',
      'err.selectPath':        'Please select a path first.',
      'err.enterName':         'Please enter your name.',
      'err.enterEmail':        'Please enter your email.',
      'err.passwordLength':    'Password must be at least 6 characters.',
      'err.passwordMismatch':  'Passwords do not match.',
      'err.registrationFailed':'Registration failed.',
      'err.matchOk':           'Passwords match \u2713',
      'err.matchNo':           'Does not match',

      // Submit page
      'submit.buildA':         'Build a',
      'submit.workflow':       'Workflow',
      'submit.buildDesc':      'Capture photos, videos and notes from the floor \u2014 turn real operations into living documents anyone can follow.',
      'submit.buildPlaceholder':'What process do you want to document?',
      'submit.start':          'Start',
      'submit.or':             'or',
      'submit.raiseA':         'Raise a',
      'submit.concern':        'Concern',
      'submit.raiseDesc':      "Describe what you've observed on the floor. AI reads the SOPs and routes it to the right people \u2014 anonymously.",
      'submit.selectArea':     'Select process area',
      'submit.placeholder':    'Just say what you\'ve been noticing...',
      'submit.shift':          'Shift',
      'submit.day':            'Day',
      'submit.evening':        'Evening',
      'submit.night':          'Night',
      'submit.rotating':       'Rotating',
      'submit.anonymous':      'Anonymous by default',
      'submit.submit':         'Submit',
      'submit.willingConsult':  'I\'m willing to be consulted',
      'submit.consultDesc':    'Optional \u2014 someone may follow up to understand your observation. Your identity is confidential to your team lead only.',
      'submit.hint':           '\u2318 + Enter to submit \u00b7 Structured automatically by AI \u00b7 No login \u00b7 No trace',
      'submit.listening':      'Listening... tap the stop button when done',
      'submit.transcribing':   'Transcribing your voice...',

      // Process areas
      'area.upstream':   'Upstream',
      'area.mediaPrep':  'Media Prep',
      'area.downstream': 'Downstream',
      'area.qc':         'QC',
      'area.facilities': 'Facilities',
      'area.other':      'Other',

      // Processing steps
      'proc.step1': 'Receiving your observation',
      'proc.step2': 'Cross-referencing SOPs & batch records',
      'proc.step3': 'Scientific & engineering evaluation',
      'proc.step4': 'Identifying corrective actions',
      'proc.step5': 'Routing to relevant contacts',
      'proc.step6': 'Building your feedback report',

      // Feedback screen
      'fb.received':      'Observation received and logged',
      'fb.newSubmission':  'New submission',
      'fb.evaluated':      'Your observation has been',
      'fb.evaluatedEm':   'evaluated.',
      'fb.sopRefs':        'SOP & Batch Record References',
      'fb.sciEval':        'Scientific & Engineering Evaluation',
      'fb.corrective':     'Potential Corrective Actions',
      'fb.contacts':       'Contacts & Departments',
      'fb.timeline':       'Review Timeline',
      'fb.pattern':        'Pattern Intelligence',
      'fb.submissions':    'Submissions on this topic',
      'fb.threshold':      'threshold',

      // Table headers
      'th.document':     'Document',
      'th.title':        'Title',
      'th.relevantStep': 'Relevant Step',
      'th.howRelates':   'How it relates',
      'th.status':       'Status',

      // Roles
      'role.operator':    'Operator',
      'role.qa':          'QA',
      'role.director':    'Director',
      'role.msat':        'MSAT',
      'role.engineering': 'Engineering',
      'role.admin':       'Admin',

      // Mic / Voice
      'mic.noAccess':  'Microphone access is required for voice input. Please allow microphone access and try again.',
      'mic.sttFailed': 'Could not transcribe audio. Make sure the server is running.',
      'err.serverDown':'Could not connect to server. Make sure it is running.',

      // Language labels
      'lang.en': 'EN',
      'lang.zh': '\u4e2d',
      'lang.es': 'ES',

      // TTS greeting
      'tts.greeting': 'Welcome to Vent. Manufacturing intelligence, designed for the floor.',

      // Query page
      'query.placeholder':  'Ask your SOPs anything...',
      'query.searching':    'Searching...',
      'query.noResults':    'No results found.',
      'query.askAnything':  'Search the facility SOPs in plain language',
      'query.newChat':      'New chat',

      // QA page
      'qa.submissions':  'SUBMISSIONS',
      'qa.all':          'All',
      'qa.pass':         'Pass',
      'qa.fail':         'Fail',
      'qa.review':       'Review',
      'qa.gap':          'Gap',
      'qa.ambiguous':    'Ambiguous',
      'qa.compliant':    'Compliant',
      'qa.today':        'Today',
      'qa.thisWeek':     'This Week',
      'qa.older':        'Older',

      // Dashboard
      'dash.title':         'Dashboard',
      'dash.totalSubs':     'Total Submissions',
      'dash.highPriority':  'High Priority',
      'dash.openItems':     'Open Items',
      'dash.resolved':      'Resolved',

      // Submissions page
      'subs.title':     'Floor Submissions',
      'subs.search':    'Search submissions...',
      'subs.all':       'All',
      'subs.open':      'Open',
      'subs.inReview':  'In Review',
      'subs.resolved':  'Resolved',
      'subs.new':       'New',
      'subs.escalated': 'Escalated',
      'subs.observation':'Observation',
      'subs.area':      'Area',
      'subs.status':    'Status',
      'subs.priority':  'Priority',

      // Workflow
      'wf.title':       'Observation Workflow',
      'wf.received':    'Received and logged',
      'wf.underReview': 'Under review',
      'wf.completed':   'Completed',

      // Builder
      'build.title':     'Document Builder',
      'build.documents': 'DOCUMENTS',
      'build.recent':    'RECENT',
      'build.save':      'Save',
      'build.publish':   'Publish',
      'build.export':    'Export',

      // Tour — UI chrome
      'tour.back':        'Back',
      'tour.next':        'Next',
      'tour.done':        'Done',
      'tour.skip':        'Skip tour',
      'tour.explore':     'Explore \u203a',
      'tour.counter':     '{current} of {total}',
      'tour.demoBanner':  'Guided Demo \u2014 Charlie is walking you through Vent',
      'tour.exitDemo':    'Exit Demo',

      // Tour — Ask Charlie (voice Q&A)
      'tour.askCharlie':  'Ask Charlie',
      'tour.listening':   'Listening\u2026',
      'tour.thinking':    'Thinking\u2026',
      'tour.askHint':     'Tap to ask about this feature',
      'tour.askError':    'Sorry, I couldn\u2019t answer that. Try again.',
      'tour.askMicError': 'Microphone access needed to ask questions.',
      'tour.askStop':     'Tap to stop',

      // Charlie — persistent voice assistant
      'charlie.tooltip':   'Charlie',
      'charlie.ready':     'Hey, what can I help with?',
      'charlie.listening': 'Listening \u2014 tap to send',
      'charlie.thinking':  'Thinking\u2026',
      'charlie.speaking':  'Speaking\u2026',
      'charlie.error':     'Sorry, something went wrong. Try again.',
      'charlie.sttError':  'Couldn\u2019t catch that \u2014 tap to try again',
      'charlie.micError':  'Microphone access needed.',

      // Tour — Step 1: Navigation Bar
      'tour.step1.title':      'Navigation Bar',
      'tour.step1.desc':       'The navigation bar gives you access to every module in Vent. The tabs visible depend on your role.',
      'tour.step1.voice':      'Let me start with the navigation bar at the top. From here you can switch between all the different modules in Vent — submitting observations, querying SOPs, reviewing submissions, and more. The tabs you see depend on your role.',
      'tour.step1.sub1.title': 'Module Tabs',
      'tour.step1.sub1.desc':  'Click any tab to switch to that module. Tabs shown depend on your role.',
      'tour.step1.sub1.voice': 'These are the module tabs. Click any of them to jump to a different part of Vent. The tabs you see here depend on your role — operators see fewer tabs, while QA and directors get the full set.',
      'tour.step1.sub2.title': 'Role Badge',
      'tour.step1.sub2.desc':  'Your role determines which features and pages you can access.',
      'tour.step1.sub2.voice': 'This badge shows your current role. It determines which modules and features are available to you.',
      'tour.step1.sub3.title': 'Sign Out',
      'tour.step1.sub3.desc':  'Sign out when you are done. Your data is saved automatically.',
      'tour.step1.sub3.voice': 'And this button signs you out. Don\'t worry, all your conversations and data are saved automatically.',

      // Tour — Step 2: Language Switcher
      'tour.step2.title':      'Language',
      'tour.step2.desc':       'Switch between English, Chinese, and Spanish. The entire interface — including this tour — updates instantly.',
      'tour.step2.voice':      'This is the language switcher. You can flip between English, Chinese, and Spanish at any time. The entire interface updates instantly, including this guided tour and voice narration.',

      // Tour — Step 3: Chat History
      'tour.step3.title':      'Chat History',
      'tour.step3.desc':       'View and search your past conversations. Pick up where you left off or analyse trends across all your queries.',
      'tour.step3.voice':      'Over here is your chat history. Every conversation you have with Vent is saved automatically. You can search through them, pick up where you left off, or even analyse trends across all your past queries.',
      'tour.step3.sub1.title': 'New Conversation',
      'tour.step3.sub1.desc':  'Start a fresh conversation. Your current chat is saved automatically.',
      'tour.step3.sub1.voice': 'Hit this button to start a fresh conversation. Don\'t worry — your current chat is saved automatically so you can always come back to it.',
      'tour.step3.sub2.title': 'Quick Actions',
      'tour.step3.sub2.desc':  'Analyse trends across all your past queries, or clear your history.',
      'tour.step3.sub2.voice': 'These quick actions let you analyse trends across all your queries, or clear your history if you need a fresh start.',
      'tour.step3.sub3.title': 'Your Conversations',
      'tour.step3.sub3.desc':  'All your previous chats are listed here. Click any to reload it.',
      'tour.step3.sub3.voice': 'All your previous conversations are listed right here. Just click any one to jump straight back in.',

      // Tour — Step 4: SOP Library
      'tour.step4.title':      'SOP Library',
      'tour.step4.desc':       'Browse and search all facility SOPs. Open them in a floating viewer where you can ask AI questions about specific documents.',
      'tour.step4.voice':      'This is the SOP Library. Every standard operating procedure for your facility lives here. You can browse, search, and even ask the AI questions about specific documents — all without leaving this page.',
      'tour.step4.sub1.title': 'AI Discovery',
      'tour.step4.sub1.desc':  'Describe what you\'re working on — the AI will find the right documents.',
      'tour.step4.sub1.voice': 'Not sure which SOP you need? Just open this and describe what you\'re working on. The AI will find the right documents for you. Pretty handy.',
      'tour.step4.sub2.title': 'Keyword Search',
      'tour.step4.sub2.desc':  'Search SOPs by keyword or document name.',
      'tour.step4.sub2.voice': 'Or if you know what you\'re looking for, use the keyword search. Results appear instantly as you type.',
      'tour.step4.sub3.title': 'Search Results',
      'tour.step4.sub3.desc':  'Click any result to open it in a floating viewer.',
      'tour.step4.sub3.voice': 'Click any result to open it in a floating viewer. You can read the full SOP and ask the AI questions about it, right here.',

      // Tour — Step 5: To-do List
      'tour.step5.title':      'To-do List',
      'tour.step5.desc':       'Track your tasks and action items. Add tasks manually or let AI create them from your conversations.',
      'tour.step5.voice':      'This is your to-do list. It helps you track tasks and action items. You can add tasks manually, check them off as you complete them, and see your progress at a glance.',
      'tour.step5.sub1.title': 'Progress Tracker',
      'tour.step5.sub1.desc':  'See your completion progress at a glance.',
      'tour.step5.sub1.voice': 'At the top you can see your overall progress — how many tasks are done out of the total.',
      'tour.step5.sub2.title': 'Task List',
      'tour.step5.sub2.desc':  'Your tasks appear here. Check them off as you go.',
      'tour.step5.sub2.voice': 'Your tasks appear here. Just click the checkbox to mark them as done.',
      'tour.step5.sub3.title': 'Add a Task',
      'tour.step5.sub3.desc':  'Type a new task and press Enter to add it.',
      'tour.step5.sub3.voice': 'Type a new task here and press Enter to add it to your list. Simple and fast.',

      // Tour — Step 6: Ask a Question
      'tour.step6.title':      'Ask a Question',
      'tour.step6.desc':       'Type your question in plain language. The AI searches your SOPs to find the answer.',
      'tour.step6.voice':      'This is where the magic happens. Just type your question in plain language — things like "what\'s the target pH range" or "how do I calibrate the DO probe". The AI searches your SOPs and gives you the answer in seconds.',

      // Tour — Step 7: Facility Area
      'tour.step7.title':      'Facility Area',
      'tour.step7.desc':       'Select which area you\'re working in — this helps the AI find the most relevant SOP sections.',
      'tour.step7.voice':      'Select your facility area here. This helps the AI narrow down to the most relevant SOP sections for your question. The more specific you are, the better the answers.',

      // Tour — Step 8: Photo Query
      'tour.step8.title':      'Photo Query',
      'tour.step8.desc':       'Snap a photo of equipment, a reading, or a label for context-specific guidance.',
      'tour.step8.voice':      'Now this is really cool. You can snap a photo of equipment, a reading, or a label, and the AI will analyse the image alongside your SOPs. It gives you context-specific guidance based on what it sees. No more guessing.',

      // Tour — Step 9: GDP Check
      'tour.step9.title':      'GDP Check',
      'tour.step9.desc':       'Upload or photograph batch record pages. AI scans for documentation errors, missing signatures, and GDP issues.',
      'tour.step9.voice':      'This is the GDP Check. Upload photos of your batch record pages and the AI will scan them for documentation errors — things like execution errors, legibility issues, incomplete entries, and missing signatures. It highlights exactly where the problems are.',
      'tour.step9.sub1.title': 'Upload Zone',
      'tour.step9.sub1.desc':  'Drag and drop images here, or click to browse your files.',
      'tour.step9.sub1.voice': 'Just drag and drop your batch record images here, or click to browse. You can upload multiple pages at once.',
      'tour.step9.sub2.title': 'Camera Capture',
      'tour.step9.sub2.desc':  'Take a photo directly with your device camera.',
      'tour.step9.sub2.voice': 'Or if you are on the floor, use the camera button to photograph the pages directly. No need to scan or transfer files.',
      'tour.step9.sub3.title': 'Run GDP Check',
      'tour.step9.sub3.desc':  'Start the AI analysis once your pages are uploaded.',
      'tour.step9.sub3.voice': 'Once you have uploaded your pages, hit this button to run the GDP check. The AI analyses each page and highlights any findings.',
      'tour.step9.sub4.title': 'Check History',
      'tour.step9.sub4.desc':  'View previous GDP checks and their results.',
      'tour.step9.sub4.voice': 'All your past GDP checks are saved here. You can go back and review previous results at any time.',

      // Tour — Step 10: Send
      'tour.step10.title':     'Send',
      'tour.step10.desc':      'Submit your question. You can also just press Enter.',
      'tour.step10.voice':     'Hit send or just press enter. Simple as that.',

      // Tour — Step 11: Quick Suggestions
      'tour.step11.title':     'Quick Suggestions',
      'tour.step11.desc':      'Not sure where to start? Click any of these to instantly ask a common question.',
      'tour.step11.voice':     'Not sure where to start? These quick suggestions cover the most common questions. Just click one and the answer comes straight back.',

      // Tour — Step 12: Pinned Answers
      'tour.step12.title':     'Pinned Answers',
      'tour.step12.desc':      'Answers you pin are saved here for quick reference. Click the bookmark icon on any answer to pin it.',
      'tour.step12.voice':     'When you find an answer you want to keep, pin it with the bookmark button. All your pinned answers show up here for quick reference.',

      // Tour — Step 13: Scroll to Latest
      'tour.step13.title':     'Scroll to Latest',
      'tour.step13.desc':      'Jump back to the newest message when you have scrolled up in a long conversation.',
      'tour.step13.voice':     'If you scroll up during a long conversation, this button appears to take you back to the latest message instantly.',

      // Tour — Step 14: Answer Actions
      'tour.step14.title':     'Answer Actions',
      'tour.step14.desc':      'Every AI answer comes with action buttons for copying, exporting, pinning, and rating.',
      'tour.step14.voice':     'Every answer from the AI comes with these action buttons. You can copy the text, export it to the Document Builder, pin it for later, or give feedback on whether it was helpful.',
      'tour.step14.sub1.title':'Copy Answer',
      'tour.step14.sub1.desc': 'Copy the full answer text to your clipboard.',
      'tour.step14.sub1.voice':'Hit copy to grab the answer text to your clipboard. Handy for pasting into emails or documents.',
      'tour.step14.sub2.title':'Export to Docs',
      'tour.step14.sub2.desc': 'Send the answer directly into the Document Builder.',
      'tour.step14.sub2.voice':'This exports the answer straight into the Document Builder, so you can turn AI answers into formal documentation.',
      'tour.step14.sub3.title':'Pin Answer',
      'tour.step14.sub3.desc': 'Bookmark this answer so it appears in your Pinned Answers panel.',
      'tour.step14.sub3.voice':'Click the bookmark icon to pin this answer. It will appear in your Pinned Answers panel at the top of the page.',
      'tour.step14.sub4.title':'Rate Answer',
      'tour.step14.sub4.desc': 'Rate the answer quality. This helps the AI improve over time.',
      'tour.step14.sub4.voice':'Use the thumbs up or thumbs down to rate the answer. This feedback helps the AI get better at answering your questions.',

      // Tour — Step 15: Raise a Concern
      'tour.step15.title':     'Raise a Concern',
      'tour.step15.desc':      'Spotted something off? Submit an anonymous observation to QA — no paperwork, no judgement.',
      'tour.step15.voice':     'Now here\'s the heart of Vent. This button lets any operator raise a concern — anonymously. Spotted something off on the floor? Equipment issue? Process deviation? Just tap this and tell us. No paperwork, no judgement. It goes straight to QA.',
      'tour.step15.sub1.title':'Describe the Observation',
      'tour.step15.sub1.desc': 'Write what you noticed — anything at all.',
      'tour.step15.sub1.voice':'Just describe what you noticed. Equipment issues, process deviations, safety concerns — anything at all. You can type it, or use the mic button to speak it.',
      'tour.step15.sub2.title':'Set Priority',
      'tour.step15.sub2.desc': 'Flag it as Low, Medium, or High.',
      'tour.step15.sub2.voice':'Set the priority. Low, medium, or high. Medium is selected by default, but if it\'s urgent — flag it.',
      'tour.step15.sub3.title':'Attach Evidence',
      'tour.step15.sub3.desc': 'Drag photos or video here. Visual evidence helps QA investigate faster.',
      'tour.step15.sub3.voice':'You can attach photos or video too. Just drag and drop, or click to browse. Visual evidence helps QA investigate much faster.',
      'tour.step15.sub4.title':'Submit',
      'tour.step15.sub4.desc': 'Send your observation anonymously to QA and MSAT.',
      'tour.step15.sub4.voice':'And that\'s it. Hit submit. Your observation gets routed straight to QA and MSAT for review. Completely anonymous. That\'s Vent — manufacturing intelligence, designed for the floor.',

      // Tour — Step 16: My Activity
      'tour.step16.title':     'My Activity',
      'tour.step16.desc':      'View all your past submissions and track their progress through the review pipeline.',
      'tour.step16.voice':     'This opens your activity drawer. You can see all your past submissions and track exactly where each one is in the review pipeline — from initial submission through to resolution.',
      'tour.step16.sub1.title':'My Submissions',
      'tour.step16.sub1.desc': 'View all your past observations and their current status.',
      'tour.step16.sub1.voice':'This tab shows all your past submissions with their current status — whether they are open, under review, or resolved.',
      'tour.step16.sub2.title':'Change Progress',
      'tour.step16.sub2.desc': 'Track the full review pipeline for each observation.',
      'tour.step16.sub2.voice':'Switch to this tab to see the full pipeline for each observation. You can track every stage from submission to resolution.',
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 中文 (CHINESE SIMPLIFIED)
    // ─────────────────────────────────────────────────────────────────────────
    zh: {
      // Navigation
      'nav.submit':       '提交',
      'nav.query':        '查询SOP',
      'nav.submissions':  '提交记录',
      'nav.docBuilder':   '文档构建',
      'nav.qaControl':    'QA控制',
      'nav.workflow':     '工作流',
      'nav.dashboard':    '仪表盘',
      'nav.signOut':      '退出登录',

      // Cinematic intro
      'cine.subtitle':       '制造智能',
      'cine.tagline':        '专为车间而设计。',
      'cine.enter':          '进入 Vent',
      'cine.voiceConnected': '语音AI已连接',
      'cine.voiceOffline':   '语音AI离线',

      // Login card
      'login.signInTab':      '登录',
      'login.registerTab':    '注册',
      'login.welcomeBack':    '欢迎回来',
      'login.signInSub':      '使用您的邮箱和密码登录。',
      'login.email':          '邮箱',
      'login.password':       '密码',
      'login.emailPlaceholder': 'you@company.com',
      'login.passwordPlaceholder': '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',
      'login.signInBtn':      '登录',
      'login.showPassword':   '显示密码',
      'login.privateAccess':  '私人访问',
      'login.privateMsg':     'Vent的注册和访问目前是<strong style="color:#fff;font-weight:400;">私密</strong>的。',
      'login.contactMsg':     '请直接联系<strong style="color:var(--accent);font-weight:500;">Mr\u00a0Vent</strong>申请用户访问权限。',
      'login.backToSignIn':   '返回登录',
      'login.footer':         '匿名设计。智能驱动。',

      // Login flow
      'login.almostThere':  '即将完成',
      'login.detailsSub':   '输入您的信息以开始提交观察报告。',
      'login.yourDept':     '您的部门',
      'login.deptSub':      '选择您的部门并创建登录凭据。',
      'login.pleaseWait':   '请稍候\u2026',

      // Login errors
      'err.emailPassword':     '请输入您的邮箱和密码。',
      'err.signInFailed':      '登录失败。',
      'err.serverUnreachable': '无法连接服务器，请重试。',
      'err.selectDept':        '请选择您的部门。',
      'err.selectPath':        '请先选择一个路径。',
      'err.enterName':         '请输入您的姓名。',
      'err.enterEmail':        '请输入您的邮箱。',
      'err.passwordLength':    '密码至少需要6个字符。',
      'err.passwordMismatch':  '密码不匹配。',
      'err.registrationFailed':'注册失败。',
      'err.matchOk':           '密码匹配 \u2713',
      'err.matchNo':           '不匹配',

      // Submit page
      'submit.buildA':         '构建',
      'submit.workflow':       '工作流',
      'submit.buildDesc':      '从车间拍摄照片、视频和笔记——将真实操作转化为任何人都可以遵循的活文档。',
      'submit.buildPlaceholder':'您想记录什么流程？',
      'submit.start':          '开始',
      'submit.or':             '或',
      'submit.raiseA':         '提出',
      'submit.concern':        '关注',
      'submit.raiseDesc':      '描述您在车间观察到的情况。AI读取SOP并将其匿名转发给相关人员。',
      'submit.selectArea':     '选择工艺区域',
      'submit.placeholder':    '说说您注意到的情况...',
      'submit.shift':          '班次',
      'submit.day':            '白班',
      'submit.evening':        '中班',
      'submit.night':          '夜班',
      'submit.rotating':       '轮班',
      'submit.anonymous':      '默认匿名',
      'submit.submit':         '提交',
      'submit.willingConsult':  '我愿意接受咨询',
      'submit.consultDesc':    '可选——可能会有人跟进以了解您的观察。您的身份仅对您的团队主管保密。',
      'submit.hint':           '\u2318 + Enter 提交 \u00b7 AI自动结构化 \u00b7 无需登录 \u00b7 无痕迹',
      'submit.listening':      '正在录音...完成后点击停止按钮',
      'submit.transcribing':   '正在转录您的语音...',

      // Process areas
      'area.upstream':   '上游',
      'area.mediaPrep':  '培养基制备',
      'area.downstream': '下游',
      'area.qc':         'QC',
      'area.facilities': '设施',
      'area.other':      '其他',

      // Processing steps
      'proc.step1': '接收您的观察',
      'proc.step2': '交叉引用SOP和批记录',
      'proc.step3': '科学和工程评估',
      'proc.step4': '识别纠正措施',
      'proc.step5': '转发给相关联系人',
      'proc.step6': '生成反馈报告',

      // Feedback screen
      'fb.received':      '观察已接收并记录',
      'fb.newSubmission':  '新提交',
      'fb.evaluated':      '您的观察已被',
      'fb.evaluatedEm':   '评估。',
      'fb.sopRefs':        'SOP和批记录参考',
      'fb.sciEval':        '科学与工程评估',
      'fb.corrective':     '潜在纠正措施',
      'fb.contacts':       '联系人和部门',
      'fb.timeline':       '审查时间线',
      'fb.pattern':        '模式智能',
      'fb.submissions':    '该主题的提交',
      'fb.threshold':      '阈值',

      // Table headers
      'th.document':     '文档',
      'th.title':        '标题',
      'th.relevantStep': '相关步骤',
      'th.howRelates':   '关联方式',
      'th.status':       '状态',

      // Roles
      'role.operator':    '操作员',
      'role.qa':          'QA',
      'role.director':    '总监',
      'role.msat':        'MSAT',
      'role.engineering': '工程',
      'role.admin':       '管理员',

      // Mic / Voice
      'mic.noAccess':  '语音输入需要麦克风权限。请允许麦克风访问后重试。',
      'mic.sttFailed': '无法转录音频。请确保服务器正在运行。',
      'err.serverDown':'无法连接服务器。请确保服务器正在运行。',

      // Language labels
      'lang.en': 'EN',
      'lang.zh': '中',
      'lang.es': 'ES',

      // TTS greeting
      'tts.greeting': '欢迎来到Vent。制造智能，专为车间而设计。',

      // Query page
      'query.placeholder':  '用自然语言搜索SOP...',
      'query.searching':    '搜索中...',
      'query.noResults':    '未找到结果。',
      'query.askAnything':  '用自然语言搜索设施SOP',
      'query.newChat':      '新对话',

      // QA page
      'qa.submissions':  '提交记录',
      'qa.all':          '全部',
      'qa.pass':         '通过',
      'qa.fail':         '未通过',
      'qa.review':       '审查',
      'qa.gap':          '缺口',
      'qa.ambiguous':    '模糊',
      'qa.compliant':    '合规',
      'qa.today':        '今天',
      'qa.thisWeek':     '本周',
      'qa.older':        '更早',

      // Dashboard
      'dash.title':         '仪表盘',
      'dash.totalSubs':     '总提交数',
      'dash.highPriority':  '高优先级',
      'dash.openItems':     '待处理项',
      'dash.resolved':      '已解决',

      // Submissions page
      'subs.title':     '车间提交',
      'subs.search':    '搜索提交...',
      'subs.all':       '全部',
      'subs.open':      '待处理',
      'subs.inReview':  '审查中',
      'subs.resolved':  '已解决',
      'subs.new':       '新',
      'subs.escalated': '已升级',
      'subs.observation':'观察',
      'subs.area':      '区域',
      'subs.status':    '状态',
      'subs.priority':  '优先级',

      // Workflow
      'wf.title':       '观察工作流',
      'wf.received':    '已接收并记录',
      'wf.underReview': '审查中',
      'wf.completed':   '已完成',

      // Builder
      'build.title':     '文档构建器',
      'build.documents': '文档',
      'build.recent':    '最近',
      'build.save':      '保存',
      'build.publish':   '发布',
      'build.export':    '导出',

      // Tour — UI chrome
      'tour.back':        '上一步',
      'tour.next':        '下一步',
      'tour.done':        '完成',
      'tour.skip':        '跳过导览',
      'tour.explore':     '探索 \u203a',
      'tour.counter':     '{current} / {total}',
      'tour.demoBanner':  '引导演示 \u2014 Charlie 正在带您了解 Vent',
      'tour.exitDemo':    '退出演示',

      // Tour — Ask Charlie (语音问答)
      'tour.askCharlie':  '问Charlie',
      'tour.listening':   '正在聆听\u2026',
      'tour.thinking':    '思考中\u2026',
      'tour.askHint':     '点击询问此功能',
      'tour.askError':    '抱歉，无法回答。请再试一次。',
      'tour.askMicError': '需要麦克风权限才能提问。',
      'tour.askStop':     '点击停止',

      // Charlie — 持久语音助手
      'charlie.tooltip':   'Charlie',
      'charlie.ready':     '嘿，有什么可以帮您的？',
      'charlie.listening': '正在聆听 \u2014 点击发送',
      'charlie.thinking':  '思考中\u2026',
      'charlie.speaking':  '正在播放\u2026',
      'charlie.error':     '抱歉，出了点问题。请再试一次。',
      'charlie.sttError':  '没有听清 \u2014 点击重试',
      'charlie.micError':  '需要麦克风权限。',

      // Tour — Step 1: 导航栏
      'tour.step1.title':      '导航栏',
      'tour.step1.desc':       '导航栏让您可以访问 Vent 的所有模块。显示的标签页取决于您的角色。',
      'tour.step1.voice':      '让我从顶部的导航栏开始介绍。从这里您可以在 Vent 的所有模块之间切换——提交观察报告、查询SOP、审查提交记录等。您看到的标签页取决于您的角色。',
      'tour.step1.sub1.title': '模块标签',
      'tour.step1.sub1.desc':  '点击任何标签即可切换到该模块。显示的标签取决于您的角色。',
      'tour.step1.sub1.voice': '这些是模块标签。点击任何一个即可跳转到 Vent 的不同部分。您看到的标签取决于您的角色——操作员看到的标签较少，而QA和总监可以看到全部。',
      'tour.step1.sub2.title': '角色标识',
      'tour.step1.sub2.desc':  '您的角色决定了您可以访问哪些功能和页面。',
      'tour.step1.sub2.voice': '这个标识显示您当前的角色。它决定了您可以使用哪些模块和功能。',
      'tour.step1.sub3.title': '退出登录',
      'tour.step1.sub3.desc':  '使用完毕后退出登录。您的数据会自动保存。',
      'tour.step1.sub3.voice': '这个按钮用于退出登录。别担心，您所有的对话和数据都会自动保存。',

      // Tour — Step 2: 语言切换
      'tour.step2.title':      '语言',
      'tour.step2.desc':       '在英语、中文和西班牙语之间切换。整个界面——包括本导览——会立即更新。',
      'tour.step2.voice':      '这是语言切换器。您可以随时在英语、中文和西班牙语之间切换。整个界面会立即更新，包括这个引导导览和语音解说。',

      // Tour — Step 3: 聊天记录
      'tour.step3.title':      '聊天记录',
      'tour.step3.desc':       '查看和搜索您过去的对话。接续之前的讨论或分析所有查询的趋势。',
      'tour.step3.voice':      '这里是您的聊天记录。您在 Vent 中的每次对话都会自动保存。您可以搜索它们，接续之前的讨论，甚至分析所有过去查询的趋势。',
      'tour.step3.sub1.title': '新对话',
      'tour.step3.sub1.desc':  '开始新的对话。当前聊天会自动保存。',
      'tour.step3.sub1.voice': '点击此按钮开始新的对话。别担心——您当前的聊天会自动保存，随时可以返回。',
      'tour.step3.sub2.title': '快捷操作',
      'tour.step3.sub2.desc':  '分析所有查询的趋势，或清除历史记录。',
      'tour.step3.sub2.voice': '这些快捷操作让您可以分析所有查询的趋势，或者在需要重新开始时清除历史记录。',
      'tour.step3.sub3.title': '您的对话',
      'tour.step3.sub3.desc':  '所有之前的聊天都列在这里。点击任何一个即可重新加载。',
      'tour.step3.sub3.voice': '您所有之前的对话都列在这里。只需点击任何一个即可直接跳回。',

      // Tour — Step 4: SOP文库
      'tour.step4.title':      'SOP文库',
      'tour.step4.desc':       '浏览和搜索所有设施SOP。在浮动查看器中打开它们，可以向AI提问。',
      'tour.step4.voice':      '这是SOP文库。您设施的所有标准操作程序都在这里。您可以浏览、搜索，甚至可以针对特定文档向AI提问——全都不需要离开这个页面。',
      'tour.step4.sub1.title': 'AI发现',
      'tour.step4.sub1.desc':  '描述您正在做什么——AI会找到正确的文档。',
      'tour.step4.sub1.voice': '不确定需要哪个SOP？只需打开这里描述您正在做什么。AI会为您找到正确的文档。非常方便。',
      'tour.step4.sub2.title': '关键词搜索',
      'tour.step4.sub2.desc':  '按关键词或文档名搜索SOP。',
      'tour.step4.sub2.voice': '或者如果您知道要找什么，使用关键词搜索。结果会在您输入时即时显示。',
      'tour.step4.sub3.title': '搜索结果',
      'tour.step4.sub3.desc':  '点击任何结果可在浮动查看器中打开。',
      'tour.step4.sub3.voice': '点击任何结果可在浮动查看器中打开。您可以阅读完整的SOP并在这里向AI提问。',

      // Tour — Step 5: 待办事项
      'tour.step5.title':      '待办事项',
      'tour.step5.desc':       '跟踪您的任务和行动项目。手动添加任务或让AI从对话中创建。',
      'tour.step5.voice':      '这是您的待办事项列表。它帮助您跟踪任务和行动项目。您可以手动添加任务，完成后勾选，并一目了然地查看进度。',
      'tour.step5.sub1.title': '进度追踪',
      'tour.step5.sub1.desc':  '一目了然地查看完成进度。',
      'tour.step5.sub1.voice': '在顶部您可以看到整体进度——已完成的任务数占总数的比例。',
      'tour.step5.sub2.title': '任务列表',
      'tour.step5.sub2.desc':  '您的任务显示在这里。完成后打勾即可。',
      'tour.step5.sub2.voice': '您的任务显示在这里。只需点击复选框即可标记为完成。',
      'tour.step5.sub3.title': '添加任务',
      'tour.step5.sub3.desc':  '输入新任务并按回车添加。',
      'tour.step5.sub3.voice': '在这里输入新任务并按回车即可添加到列表中。简单快速。',

      // Tour — Step 6: 提问
      'tour.step6.title':      '提问',
      'tour.step6.desc':       '用自然语言输入您的问题。AI会搜索您的SOP来找到答案。',
      'tour.step6.voice':      '这是最精彩的部分。只需用自然语言输入您的问题——比如"目标pH范围是多少"或"如何校准DO探头"。AI会搜索您的SOP，在几秒钟内给出答案。',

      // Tour — Step 7: 设施区域
      'tour.step7.title':      '设施区域',
      'tour.step7.desc':       '选择您工作的区域——这帮助AI找到最相关的SOP部分。',
      'tour.step7.voice':      '在这里选择您的设施区域。这帮助AI缩小到与您问题最相关的SOP部分。越具体，答案越好。',

      // Tour — Step 8: 照片查询
      'tour.step8.title':      '照片查询',
      'tour.step8.desc':       '拍摄设备、读数或标签的照片，获取针对性指导。',
      'tour.step8.voice':      '这个功能非常酷。您可以拍摄设备、读数或标签的照片，AI会结合您的SOP分析图像。它根据看到的内容给出针对性指导。不再需要猜测。',

      // Tour — Step 9: GDP检查
      'tour.step9.title':      'GDP检查',
      'tour.step9.desc':       '上传或拍摄批记录页面。AI扫描文档错误、缺失签名和GDP问题。',
      'tour.step9.voice':      '这是GDP检查功能。上传批记录页面的照片，AI会扫描文档错误——比如执行错误、清晰度问题、不完整条目和缺失签名。它会精确标出问题所在。',
      'tour.step9.sub1.title': '上传区域',
      'tour.step9.sub1.desc':  '将图片拖放到这里，或点击浏览文件。',
      'tour.step9.sub1.voice': '只需将批记录图片拖放到这里，或点击浏览。您可以一次上传多个页面。',
      'tour.step9.sub2.title': '相机拍摄',
      'tour.step9.sub2.desc':  '直接用设备摄像头拍照。',
      'tour.step9.sub2.voice': '或者如果您在车间，使用相机按钮直接拍摄页面。无需扫描或传输文件。',
      'tour.step9.sub3.title': '运行GDP检查',
      'tour.step9.sub3.desc':  '上传页面后开始AI分析。',
      'tour.step9.sub3.voice': '上传页面后，点击此按钮运行GDP检查。AI会分析每个页面并标出所有发现。',
      'tour.step9.sub4.title': '检查历史',
      'tour.step9.sub4.desc':  '查看之前的GDP检查及其结果。',
      'tour.step9.sub4.voice': '所有过去的GDP检查都保存在这里。您可以随时返回查看之前的结果。',

      // Tour — Step 10: 发送
      'tour.step10.title':     '发送',
      'tour.step10.desc':      '提交您的问题。也可以直接按回车。',
      'tour.step10.voice':     '点击发送或直接按回车。就这么简单。',

      // Tour — Step 11: 快捷建议
      'tour.step11.title':     '快捷建议',
      'tour.step11.desc':      '不确定从哪里开始？点击任何一个即可立即提出常见问题。',
      'tour.step11.voice':     '不确定从哪里开始？这些快捷建议涵盖了最常见的问题。只需点击一个，答案马上就来。',

      // Tour — Step 12: 收藏答案
      'tour.step12.title':     '收藏答案',
      'tour.step12.desc':      '您收藏的答案保存在这里便于快速参考。点击任何答案上的书签图标即可收藏。',
      'tour.step12.voice':     '当您找到想保留的答案时，用书签按钮收藏它。所有收藏的答案都会显示在这里，方便快速参考。',

      // Tour — Step 13: 滚动到最新
      'tour.step13.title':     '滚动到最新',
      'tour.step13.desc':      '在长对话中向上滚动后，点击跳回最新消息。',
      'tour.step13.voice':     '如果您在长对话中向上滚动，这个按钮会出现，让您立即跳回最新消息。',

      // Tour — Step 14: 答案操作
      'tour.step14.title':     '答案操作',
      'tour.step14.desc':      '每个AI答案都带有复制、导出、收藏和评价的操作按钮。',
      'tour.step14.voice':     'AI的每个答案都带有这些操作按钮。您可以复制文本、导出到文档构建器、收藏以备后用，或反馈是否有帮助。',
      'tour.step14.sub1.title':'复制答案',
      'tour.step14.sub1.desc': '将完整答案文本复制到剪贴板。',
      'tour.step14.sub1.voice':'点击复制将答案文本复制到剪贴板。方便粘贴到邮件或文档中。',
      'tour.step14.sub2.title':'导出到文档',
      'tour.step14.sub2.desc': '将答案直接发送到文档构建器。',
      'tour.step14.sub2.voice':'这会将答案直接导出到文档构建器，让您可以把AI答案转化为正式文档。',
      'tour.step14.sub3.title':'收藏答案',
      'tour.step14.sub3.desc': '收藏此答案，使其显示在收藏面板中。',
      'tour.step14.sub3.voice':'点击书签图标收藏此答案。它会出现在页面顶部的收藏答案面板中。',
      'tour.step14.sub4.title':'评价答案',
      'tour.step14.sub4.desc': '评价答案质量。这有助于AI不断改进。',
      'tour.step14.sub4.voice':'使用点赞或点踩来评价答案。这些反馈帮助AI更好地回答您的问题。',

      // Tour — Step 15: 提出关注
      'tour.step15.title':     '提出关注',
      'tour.step15.desc':      '发现异常？匿名向QA提交观察报告——无需纸质文件，无需担忧。',
      'tour.step15.voice':     '这是 Vent 的核心功能。这个按钮让任何操作员都可以匿名提出关注。在车间发现异常？设备问题？流程偏差？只需点击这里告诉我们。无需纸质文件，无需担忧。直接发送给QA。',
      'tour.step15.sub1.title':'描述观察',
      'tour.step15.sub1.desc': '写下您注意到的任何情况。',
      'tour.step15.sub1.voice':'只需描述您注意到的情况。设备问题、流程偏差、安全隐患——任何事情都可以。您可以打字，也可以用麦克风语音输入。',
      'tour.step15.sub2.title':'设置优先级',
      'tour.step15.sub2.desc': '标记为低、中或高。',
      'tour.step15.sub2.voice':'设置优先级。低、中或高。默认选择中等，但如果紧急——请标记它。',
      'tour.step15.sub3.title':'附加证据',
      'tour.step15.sub3.desc': '拖拽照片或视频到这里。视觉证据帮助QA更快调查。',
      'tour.step15.sub3.voice':'您也可以附加照片或视频。只需拖放，或点击浏览。视觉证据帮助QA更快地进行调查。',
      'tour.step15.sub4.title':'提交',
      'tour.step15.sub4.desc': '将您的观察匿名发送给QA和MSAT。',
      'tour.step15.sub4.voice':'就这样。点击提交。您的观察报告会直接发送给QA和MSAT进行审查。完全匿名。这就是 Vent——制造智能，专为车间而设计。',

      // Tour — Step 16: 我的活动
      'tour.step16.title':     '我的活动',
      'tour.step16.desc':      '查看您所有过去的提交记录，并跟踪它们在审查流程中的进展。',
      'tour.step16.voice':     '这会打开您的活动抽屉。您可以看到所有过去的提交记录，并精确跟踪每一条在审查流程中的位置——从初始提交到最终解决。',
      'tour.step16.sub1.title':'我的提交',
      'tour.step16.sub1.desc': '查看您所有过去的观察报告及其当前状态。',
      'tour.step16.sub1.voice':'这个标签显示您所有过去的提交及其当前状态——是待处理、审查中还是已解决。',
      'tour.step16.sub2.title':'变更进展',
      'tour.step16.sub2.desc': '跟踪每个观察报告的完整审查流程。',
      'tour.step16.sub2.voice':'切换到这个标签查看每个观察报告的完整流程。您可以跟踪从提交到解决的每个阶段。',
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ESPAÑOL (SPANISH)
    // ─────────────────────────────────────────────────────────────────────────
    es: {
      // Navigation
      'nav.submit':       'Enviar',
      'nav.query':        'Consultar SOPs',
      'nav.submissions':  'Env\u00edos',
      'nav.docBuilder':   'Constructor',
      'nav.qaControl':    'Control QA',
      'nav.workflow':     'Flujo',
      'nav.dashboard':    'Panel',
      'nav.signOut':      'Cerrar sesi\u00f3n',

      // Cinematic intro
      'cine.subtitle':       'Inteligencia de Manufactura',
      'cine.tagline':        'Dise\u00f1ado para la planta.',
      'cine.enter':          'Entrar a Vent',
      'cine.voiceConnected': 'VOZ AI CONECTADA',
      'cine.voiceOffline':   'VOZ AI DESCONECTADA',

      // Login card
      'login.signInTab':      'Iniciar sesi\u00f3n',
      'login.registerTab':    'Registrarse',
      'login.welcomeBack':    'Bienvenido de nuevo',
      'login.signInSub':      'Inicia sesi\u00f3n con tu correo y contrase\u00f1a.',
      'login.email':          'Correo',
      'login.password':       'Contrase\u00f1a',
      'login.emailPlaceholder': 'tu@empresa.com',
      'login.passwordPlaceholder': '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',
      'login.signInBtn':      'Iniciar sesi\u00f3n',
      'login.showPassword':   'Mostrar contrase\u00f1a',
      'login.privateAccess':  'Acceso Privado',
      'login.privateMsg':     'El registro y acceso a Vent es <strong style="color:#fff;font-weight:400;">privado</strong> por el momento.',
      'login.contactMsg':     'Contacta directamente a <strong style="color:var(--accent);font-weight:500;">Mr\u00a0Vent</strong> para solicitar acceso.',
      'login.backToSignIn':   'Volver a iniciar sesi\u00f3n',
      'login.footer':         'An\u00f3nimo por dise\u00f1o. Inteligente por necesidad.',

      // Login flow
      'login.almostThere':  'Casi listo',
      'login.detailsSub':   'Ingresa tus datos para comenzar a enviar observaciones.',
      'login.yourDept':     'Tu departamento',
      'login.deptSub':      'Selecciona tu departamento y crea tus credenciales.',
      'login.pleaseWait':   'Por favor espera\u2026',

      // Login errors
      'err.emailPassword':     'Ingresa tu correo y contrase\u00f1a.',
      'err.signInFailed':      'Error al iniciar sesi\u00f3n.',
      'err.serverUnreachable': 'No se pudo conectar al servidor. Int\u00e9ntalo de nuevo.',
      'err.selectDept':        'Selecciona tu departamento.',
      'err.selectPath':        'Selecciona un camino primero.',
      'err.enterName':         'Ingresa tu nombre.',
      'err.enterEmail':        'Ingresa tu correo.',
      'err.passwordLength':    'La contrase\u00f1a debe tener al menos 6 caracteres.',
      'err.passwordMismatch':  'Las contrase\u00f1as no coinciden.',
      'err.registrationFailed':'Error en el registro.',
      'err.matchOk':           'Contrase\u00f1as coinciden \u2713',
      'err.matchNo':           'No coincide',

      // Submit page
      'submit.buildA':         'Crear un',
      'submit.workflow':       'Flujo de trabajo',
      'submit.buildDesc':      'Captura fotos, videos y notas de la planta \u2014 convierte operaciones reales en documentos vivos que cualquiera puede seguir.',
      'submit.buildPlaceholder':'\u00bfQu\u00e9 proceso quieres documentar?',
      'submit.start':          'Iniciar',
      'submit.or':             'o',
      'submit.raiseA':         'Reportar una',
      'submit.concern':        'Preocupaci\u00f3n',
      'submit.raiseDesc':      'Describe lo que has observado en la planta. La IA lee los SOPs y lo env\u00eda a las personas correctas \u2014 de forma an\u00f3nima.',
      'submit.selectArea':     'Selecciona el \u00e1rea de proceso',
      'submit.placeholder':    'Cuenta lo que has estado observando...',
      'submit.shift':          'Turno',
      'submit.day':            'D\u00eda',
      'submit.evening':        'Tarde',
      'submit.night':          'Noche',
      'submit.rotating':       'Rotativo',
      'submit.anonymous':      'An\u00f3nimo por defecto',
      'submit.submit':         'Enviar',
      'submit.willingConsult':  'Estoy dispuesto a ser consultado',
      'submit.consultDesc':    'Opcional \u2014 alguien puede dar seguimiento para entender tu observaci\u00f3n. Tu identidad es confidencial solo para tu l\u00edder de equipo.',
      'submit.hint':           '\u2318 + Enter para enviar \u00b7 Estructurado autom\u00e1ticamente por IA \u00b7 Sin login \u00b7 Sin rastro',
      'submit.listening':      'Escuchando... toca el bot\u00f3n de parar cuando termines',
      'submit.transcribing':   'Transcribiendo tu voz...',

      // Process areas
      'area.upstream':   'Upstream',
      'area.mediaPrep':  'Prep. de Medios',
      'area.downstream': 'Downstream',
      'area.qc':         'QC',
      'area.facilities': 'Instalaciones',
      'area.other':      'Otro',

      // Processing steps
      'proc.step1': 'Recibiendo tu observaci\u00f3n',
      'proc.step2': 'Cruzando referencias con SOPs y registros',
      'proc.step3': 'Evaluaci\u00f3n cient\u00edfica e ingenier\u00eda',
      'proc.step4': 'Identificando acciones correctivas',
      'proc.step5': 'Enviando a contactos relevantes',
      'proc.step6': 'Generando tu reporte de retroalimentaci\u00f3n',

      // Feedback screen
      'fb.received':      'Observaci\u00f3n recibida y registrada',
      'fb.newSubmission':  'Nuevo env\u00edo',
      'fb.evaluated':      'Tu observaci\u00f3n ha sido',
      'fb.evaluatedEm':   'evaluada.',
      'fb.sopRefs':        'Referencias de SOP y Registros',
      'fb.sciEval':        'Evaluaci\u00f3n Cient\u00edfica e Ingenier\u00eda',
      'fb.corrective':     'Acciones Correctivas Potenciales',
      'fb.contacts':       'Contactos y Departamentos',
      'fb.timeline':       'L\u00ednea de Tiempo',
      'fb.pattern':        'Inteligencia de Patrones',
      'fb.submissions':    'Env\u00edos sobre este tema',
      'fb.threshold':      'umbral',

      // Table headers
      'th.document':     'Documento',
      'th.title':        'T\u00edtulo',
      'th.relevantStep': 'Paso Relevante',
      'th.howRelates':   'C\u00f3mo se relaciona',
      'th.status':       'Estado',

      // Roles
      'role.operator':    'Operador',
      'role.qa':          'QA',
      'role.director':    'Director',
      'role.msat':        'MSAT',
      'role.engineering': 'Ingenier\u00eda',
      'role.admin':       'Admin',

      // Mic / Voice
      'mic.noAccess':  'Se requiere acceso al micr\u00f3fono para entrada de voz. Permite el acceso e int\u00e9ntalo de nuevo.',
      'mic.sttFailed': 'No se pudo transcribir el audio. Aseg\u00farate de que el servidor est\u00e9 funcionando.',
      'err.serverDown':'No se pudo conectar al servidor. Aseg\u00farate de que est\u00e9 funcionando.',

      // Language labels
      'lang.en': 'EN',
      'lang.zh': '中',
      'lang.es': 'ES',

      // TTS greeting
      'tts.greeting': 'Bienvenido a Vent. Inteligencia de manufactura, dise\u00f1ado para la planta.',

      // Query page
      'query.placeholder':  'Pregunta sobre tus SOPs...',
      'query.searching':    'Buscando...',
      'query.noResults':    'No se encontraron resultados.',
      'query.askAnything':  'Busca los SOPs de la instalaci\u00f3n en lenguaje natural',
      'query.newChat':      'Nueva consulta',

      // QA page
      'qa.submissions':  'ENV\u00cdOS',
      'qa.all':          'Todos',
      'qa.pass':         'Aprobado',
      'qa.fail':         'Fallido',
      'qa.review':       'Revisi\u00f3n',
      'qa.gap':          'Brecha',
      'qa.ambiguous':    'Ambiguo',
      'qa.compliant':    'Conforme',
      'qa.today':        'Hoy',
      'qa.thisWeek':     'Esta Semana',
      'qa.older':        'Anteriores',

      // Dashboard
      'dash.title':         'Panel',
      'dash.totalSubs':     'Total de Env\u00edos',
      'dash.highPriority':  'Alta Prioridad',
      'dash.openItems':     'Pendientes',
      'dash.resolved':      'Resueltos',

      // Submissions page
      'subs.title':     'Env\u00edos de Planta',
      'subs.search':    'Buscar env\u00edos...',
      'subs.all':       'Todos',
      'subs.open':      'Abiertos',
      'subs.inReview':  'En Revisi\u00f3n',
      'subs.resolved':  'Resueltos',
      'subs.new':       'Nuevo',
      'subs.escalated': 'Escalado',
      'subs.observation':'Observaci\u00f3n',
      'subs.area':      '\u00c1rea',
      'subs.status':    'Estado',
      'subs.priority':  'Prioridad',

      // Workflow
      'wf.title':       'Flujo de Observaci\u00f3n',
      'wf.received':    'Recibido y registrado',
      'wf.underReview': 'En revisi\u00f3n',
      'wf.completed':   'Completado',

      // Builder
      'build.title':     'Constructor de Documentos',
      'build.documents': 'DOCUMENTOS',
      'build.recent':    'RECIENTES',
      'build.save':      'Guardar',
      'build.publish':   'Publicar',
      'build.export':    'Exportar',

      // Tour — UI chrome
      'tour.back':        'Atr\u00e1s',
      'tour.next':        'Siguiente',
      'tour.done':        'Listo',
      'tour.skip':        'Saltar tour',
      'tour.explore':     'Explorar \u203a',
      'tour.counter':     '{current} de {total}',
      'tour.demoBanner':  'Demo guiada \u2014 Charlie te est\u00e1 mostrando Vent',
      'tour.exitDemo':    'Salir de demo',

      // Tour — Ask Charlie (preguntas por voz)
      'tour.askCharlie':  'Pregunta a Charlie',
      'tour.listening':   'Escuchando\u2026',
      'tour.thinking':    'Pensando\u2026',
      'tour.askHint':     'Toca para preguntar sobre esta funci\u00f3n',
      'tour.askError':    'Lo siento, no pude responder. Int\u00e9ntalo de nuevo.',
      'tour.askMicError': 'Se necesita acceso al micr\u00f3fono para preguntar.',
      'tour.askStop':     'Toca para detener',

      // Charlie — asistente de voz persistente
      'charlie.tooltip':   'Charlie',
      'charlie.ready':     'Hola, \u00bfen qu\u00e9 puedo ayudarte?',
      'charlie.listening': 'Escuchando \u2014 toca para enviar',
      'charlie.thinking':  'Pensando\u2026',
      'charlie.speaking':  'Hablando\u2026',
      'charlie.error':     'Lo siento, algo sali\u00f3 mal. Int\u00e9ntalo de nuevo.',
      'charlie.sttError':  'No te escuch\u00e9 \u2014 toca para reintentar',
      'charlie.micError':  'Se necesita acceso al micr\u00f3fono.',

      // Tour — Step 1: Barra de navegaci\u00f3n
      'tour.step1.title':      'Barra de Navegaci\u00f3n',
      'tour.step1.desc':       'La barra de navegaci\u00f3n te da acceso a todos los m\u00f3dulos de Vent. Las pesta\u00f1as visibles dependen de tu rol.',
      'tour.step1.voice':      'Empecemos con la barra de navegaci\u00f3n en la parte superior. Desde aqu\u00ed puedes cambiar entre todos los m\u00f3dulos de Vent — enviar observaciones, consultar SOPs, revisar env\u00edos y m\u00e1s. Las pesta\u00f1as que ves dependen de tu rol.',
      'tour.step1.sub1.title': 'Pesta\u00f1as de M\u00f3dulos',
      'tour.step1.sub1.desc':  'Haz clic en cualquier pesta\u00f1a para cambiar de m\u00f3dulo. Las pesta\u00f1as mostradas dependen de tu rol.',
      'tour.step1.sub1.voice': 'Estas son las pesta\u00f1as de m\u00f3dulos. Haz clic en cualquiera para ir a una parte diferente de Vent. Las pesta\u00f1as dependen de tu rol — los operadores ven menos, mientras que QA y directores tienen acceso completo.',
      'tour.step1.sub2.title': 'Insignia de Rol',
      'tour.step1.sub2.desc':  'Tu rol determina a qu\u00e9 funciones y p\u00e1ginas puedes acceder.',
      'tour.step1.sub2.voice': 'Esta insignia muestra tu rol actual. Determina qu\u00e9 m\u00f3dulos y funciones est\u00e1n disponibles para ti.',
      'tour.step1.sub3.title': 'Cerrar Sesi\u00f3n',
      'tour.step1.sub3.desc':  'Cierra sesi\u00f3n cuando termines. Tus datos se guardan autom\u00e1ticamente.',
      'tour.step1.sub3.voice': 'Y este bot\u00f3n cierra tu sesi\u00f3n. No te preocupes, todas tus conversaciones y datos se guardan autom\u00e1ticamente.',

      // Tour — Step 2: Selector de idioma
      'tour.step2.title':      'Idioma',
      'tour.step2.desc':       'Cambia entre ingl\u00e9s, chino y espa\u00f1ol. Toda la interfaz — incluyendo este tour — se actualiza instant\u00e1neamente.',
      'tour.step2.voice':      'Este es el selector de idioma. Puedes cambiar entre ingl\u00e9s, chino y espa\u00f1ol en cualquier momento. Toda la interfaz se actualiza instant\u00e1neamente, incluyendo este tour guiado y la narraci\u00f3n por voz.',

      // Tour — Step 3: Historial de chat
      'tour.step3.title':      'Historial de Chat',
      'tour.step3.desc':       'Ve y busca tus conversaciones anteriores. Contin\u00faa donde lo dejaste o analiza tendencias en todas tus consultas.',
      'tour.step3.voice':      'Aqu\u00ed est\u00e1 tu historial de chat. Cada conversaci\u00f3n que tienes con Vent se guarda autom\u00e1ticamente. Puedes buscar, continuar donde lo dejaste, o incluso analizar tendencias en todas tus consultas pasadas.',
      'tour.step3.sub1.title': 'Nueva Conversaci\u00f3n',
      'tour.step3.sub1.desc':  'Inicia una conversaci\u00f3n nueva. Tu chat actual se guarda autom\u00e1ticamente.',
      'tour.step3.sub1.voice': 'Presiona este bot\u00f3n para iniciar una conversaci\u00f3n nueva. No te preocupes — tu chat actual se guarda autom\u00e1ticamente para que siempre puedas volver.',
      'tour.step3.sub2.title': 'Acciones R\u00e1pidas',
      'tour.step3.sub2.desc':  'Analiza tendencias en todas tus consultas o borra tu historial.',
      'tour.step3.sub2.voice': 'Estas acciones r\u00e1pidas te permiten analizar tendencias en todas tus consultas, o borrar tu historial si necesitas empezar de cero.',
      'tour.step3.sub3.title': 'Tus Conversaciones',
      'tour.step3.sub3.desc':  'Todos tus chats anteriores est\u00e1n listados aqu\u00ed. Haz clic en cualquiera para recargarla.',
      'tour.step3.sub3.voice': 'Todas tus conversaciones anteriores est\u00e1n listadas aqu\u00ed. Solo haz clic en cualquiera para volver directamente.',

      // Tour — Step 4: Biblioteca SOP
      'tour.step4.title':      'Biblioteca SOP',
      'tour.step4.desc':       'Navega y busca todos los SOPs de la instalaci\u00f3n. \u00c1brelos en un visor flotante donde puedes hacer preguntas a la IA.',
      'tour.step4.voice':      'Esta es la Biblioteca SOP. Todos los procedimientos operativos est\u00e1ndar de tu instalaci\u00f3n est\u00e1n aqu\u00ed. Puedes navegar, buscar e incluso hacer preguntas a la IA sobre documentos espec\u00edficos — todo sin salir de esta p\u00e1gina.',
      'tour.step4.sub1.title': 'Descubrimiento IA',
      'tour.step4.sub1.desc':  'Describe en qu\u00e9 est\u00e1s trabajando — la IA encontrar\u00e1 los documentos correctos.',
      'tour.step4.sub1.voice': '\u00bfNo est\u00e1s seguro de qu\u00e9 SOP necesitas? Solo abre esto y describe en qu\u00e9 est\u00e1s trabajando. La IA encontrar\u00e1 los documentos correctos. Muy \u00fatil.',
      'tour.step4.sub2.title': 'B\u00fasqueda por Palabras',
      'tour.step4.sub2.desc':  'Busca SOPs por palabra clave o nombre de documento.',
      'tour.step4.sub2.voice': 'O si sabes lo que buscas, usa la b\u00fasqueda por palabras clave. Los resultados aparecen instant\u00e1neamente mientras escribes.',
      'tour.step4.sub3.title': 'Resultados',
      'tour.step4.sub3.desc':  'Haz clic en cualquier resultado para abrirlo en un visor flotante.',
      'tour.step4.sub3.voice': 'Haz clic en cualquier resultado para abrirlo en un visor flotante. Puedes leer el SOP completo y hacer preguntas a la IA, todo aqu\u00ed.',

      // Tour — Step 5: Lista de tareas
      'tour.step5.title':      'Lista de Tareas',
      'tour.step5.desc':       'Sigue tus tareas y acciones pendientes. Agrega tareas manualmente o deja que la IA las cree de tus conversaciones.',
      'tour.step5.voice':      'Esta es tu lista de tareas. Te ayuda a seguir tareas y acciones pendientes. Puedes agregar tareas manualmente, marcarlas como completadas y ver tu progreso de un vistazo.',
      'tour.step5.sub1.title': 'Progreso',
      'tour.step5.sub1.desc':  'Ve tu progreso de completado de un vistazo.',
      'tour.step5.sub1.voice': 'En la parte superior puedes ver tu progreso general — cu\u00e1ntas tareas est\u00e1n completadas del total.',
      'tour.step5.sub2.title': 'Lista de Tareas',
      'tour.step5.sub2.desc':  'Tus tareas aparecen aqu\u00ed. M\u00e1rcalas a medida que las completas.',
      'tour.step5.sub2.voice': 'Tus tareas aparecen aqu\u00ed. Solo haz clic en la casilla para marcarlas como completadas.',
      'tour.step5.sub3.title': 'Agregar Tarea',
      'tour.step5.sub3.desc':  'Escribe una nueva tarea y presiona Enter para agregarla.',
      'tour.step5.sub3.voice': 'Escribe una nueva tarea aqu\u00ed y presiona Enter para agregarla a tu lista. Simple y r\u00e1pido.',

      // Tour — Step 6: Haz una pregunta
      'tour.step6.title':      'Haz una Pregunta',
      'tour.step6.desc':       'Escribe tu pregunta en lenguaje natural. La IA busca en tus SOPs para encontrar la respuesta.',
      'tour.step6.voice':      'Aqu\u00ed es donde sucede la magia. Solo escribe tu pregunta en lenguaje natural — cosas como "cu\u00e1l es el rango de pH objetivo" o "c\u00f3mo calibro la sonda de OD". La IA busca en tus SOPs y te da la respuesta en segundos.',

      // Tour — Step 7: \u00c1rea de instalaci\u00f3n
      'tour.step7.title':      '\u00c1rea de Instalaci\u00f3n',
      'tour.step7.desc':       'Selecciona en qu\u00e9 \u00e1rea est\u00e1s trabajando — esto ayuda a la IA a encontrar las secciones m\u00e1s relevantes del SOP.',
      'tour.step7.voice':      'Selecciona tu \u00e1rea de la instalaci\u00f3n aqu\u00ed. Esto ayuda a la IA a enfocarse en las secciones m\u00e1s relevantes del SOP para tu pregunta. Mientras m\u00e1s espec\u00edfico seas, mejores ser\u00e1n las respuestas.',

      // Tour — Step 8: Consulta con foto
      'tour.step8.title':      'Consulta con Foto',
      'tour.step8.desc':       'Toma una foto de equipos, una lectura o una etiqueta para obtener orientaci\u00f3n espec\u00edfica.',
      'tour.step8.voice':      'Esto es realmente genial. Puedes tomar una foto de equipos, una lectura o una etiqueta, y la IA analizar\u00e1 la imagen junto con tus SOPs. Te da orientaci\u00f3n espec\u00edfica basada en lo que ve. No m\u00e1s adivinanzas.',

      // Tour — Step 9: Verificaci\u00f3n GDP
      'tour.step9.title':      'Verificaci\u00f3n GDP',
      'tour.step9.desc':       'Sube o fotograf\u00eda p\u00e1ginas de registros de lote. La IA busca errores de documentaci\u00f3n, firmas faltantes y problemas GDP.',
      'tour.step9.voice':      'Esta es la Verificaci\u00f3n GDP. Sube fotos de tus p\u00e1ginas de registros de lote y la IA las escanear\u00e1 en busca de errores de documentaci\u00f3n — errores de ejecuci\u00f3n, problemas de legibilidad, entradas incompletas y firmas faltantes. Se\u00f1ala exactamente d\u00f3nde est\u00e1n los problemas.',
      'tour.step9.sub1.title': 'Zona de Subida',
      'tour.step9.sub1.desc':  'Arrastra y suelta im\u00e1genes aqu\u00ed, o haz clic para explorar tus archivos.',
      'tour.step9.sub1.voice': 'Solo arrastra y suelta tus im\u00e1genes de registros de lote aqu\u00ed, o haz clic para explorar. Puedes subir m\u00faltiples p\u00e1ginas a la vez.',
      'tour.step9.sub2.title': 'Captura con C\u00e1mara',
      'tour.step9.sub2.desc':  'Toma una foto directamente con la c\u00e1mara de tu dispositivo.',
      'tour.step9.sub2.voice': 'O si est\u00e1s en la planta, usa el bot\u00f3n de c\u00e1mara para fotografiar las p\u00e1ginas directamente. Sin necesidad de escanear o transferir archivos.',
      'tour.step9.sub3.title': 'Ejecutar Verificaci\u00f3n',
      'tour.step9.sub3.desc':  'Inicia el an\u00e1lisis de IA una vez subidas tus p\u00e1ginas.',
      'tour.step9.sub3.voice': 'Una vez que hayas subido tus p\u00e1ginas, presiona este bot\u00f3n para ejecutar la verificaci\u00f3n GDP. La IA analiza cada p\u00e1gina y resalta cualquier hallazgo.',
      'tour.step9.sub4.title': 'Historial de Verificaciones',
      'tour.step9.sub4.desc':  'Ve verificaciones GDP anteriores y sus resultados.',
      'tour.step9.sub4.voice': 'Todas tus verificaciones GDP pasadas est\u00e1n guardadas aqu\u00ed. Puedes volver y revisar resultados anteriores en cualquier momento.',

      // Tour — Step 10: Enviar
      'tour.step10.title':     'Enviar',
      'tour.step10.desc':      'Env\u00eda tu pregunta. Tambi\u00e9n puedes simplemente presionar Enter.',
      'tour.step10.voice':     'Presiona enviar o simplemente presiona Enter. As\u00ed de simple.',

      // Tour — Step 11: Sugerencias r\u00e1pidas
      'tour.step11.title':     'Sugerencias R\u00e1pidas',
      'tour.step11.desc':      '\u00bfNo sabes por d\u00f3nde empezar? Haz clic en cualquiera para hacer una pregunta com\u00fan al instante.',
      'tour.step11.voice':     '\u00bfNo sabes por d\u00f3nde empezar? Estas sugerencias r\u00e1pidas cubren las preguntas m\u00e1s comunes. Solo haz clic en una y la respuesta llega de inmediato.',

      // Tour — Step 12: Respuestas fijadas
      'tour.step12.title':     'Respuestas Fijadas',
      'tour.step12.desc':      'Las respuestas que fijas se guardan aqu\u00ed para referencia r\u00e1pida. Haz clic en el icono de marcador en cualquier respuesta para fijarla.',
      'tour.step12.voice':     'Cuando encuentres una respuesta que quieras conservar, f\u00edjala con el bot\u00f3n de marcador. Todas tus respuestas fijadas aparecen aqu\u00ed para referencia r\u00e1pida.',

      // Tour — Step 13: Ir al \u00faltimo
      'tour.step13.title':     'Ir al \u00daltimo',
      'tour.step13.desc':      'Vuelve al mensaje m\u00e1s reciente cuando hayas subido en una conversaci\u00f3n larga.',
      'tour.step13.voice':     'Si subes durante una conversaci\u00f3n larga, este bot\u00f3n aparece para llevarte al \u00faltimo mensaje instant\u00e1neamente.',

      // Tour — Step 14: Acciones de respuesta
      'tour.step14.title':     'Acciones de Respuesta',
      'tour.step14.desc':      'Cada respuesta de la IA viene con botones de acci\u00f3n para copiar, exportar, fijar y calificar.',
      'tour.step14.voice':     'Cada respuesta de la IA viene con estos botones de acci\u00f3n. Puedes copiar el texto, exportarlo al Constructor de Documentos, fijarlo para despu\u00e9s, o dar retroalimentaci\u00f3n sobre si fue \u00fatil.',
      'tour.step14.sub1.title':'Copiar Respuesta',
      'tour.step14.sub1.desc': 'Copia el texto completo de la respuesta a tu portapapeles.',
      'tour.step14.sub1.voice':'Presiona copiar para llevar el texto de la respuesta a tu portapapeles. \u00datil para pegar en correos o documentos.',
      'tour.step14.sub2.title':'Exportar a Docs',
      'tour.step14.sub2.desc': 'Env\u00eda la respuesta directamente al Constructor de Documentos.',
      'tour.step14.sub2.voice':'Esto exporta la respuesta directamente al Constructor de Documentos, para que puedas convertir respuestas de la IA en documentaci\u00f3n formal.',
      'tour.step14.sub3.title':'Fijar Respuesta',
      'tour.step14.sub3.desc': 'Marca esta respuesta para que aparezca en tu panel de Respuestas Fijadas.',
      'tour.step14.sub3.voice':'Haz clic en el icono de marcador para fijar esta respuesta. Aparecer\u00e1 en tu panel de Respuestas Fijadas en la parte superior de la p\u00e1gina.',
      'tour.step14.sub4.title':'Calificar Respuesta',
      'tour.step14.sub4.desc': 'Califica la calidad de la respuesta. Esto ayuda a la IA a mejorar con el tiempo.',
      'tour.step14.sub4.voice':'Usa el pulgar arriba o abajo para calificar la respuesta. Esta retroalimentaci\u00f3n ayuda a la IA a mejorar sus respuestas.',

      // Tour — Step 15: Reportar preocupaci\u00f3n
      'tour.step15.title':     'Reportar Preocupaci\u00f3n',
      'tour.step15.desc':      '\u00bfNotaste algo fuera de lugar? Env\u00eda una observaci\u00f3n an\u00f3nima a QA — sin papeleo, sin juicios.',
      'tour.step15.voice':     'Ahora viene el coraz\u00f3n de Vent. Este bot\u00f3n permite a cualquier operador reportar una preocupaci\u00f3n — de forma an\u00f3nima. \u00bfNotaste algo fuera de lugar en la planta? \u00bfProblema de equipos? \u00bfDesviaci\u00f3n de proceso? Solo toca esto y cu\u00e9ntanos. Sin papeleo, sin juicios. Va directo a QA.',
      'tour.step15.sub1.title':'Describe la Observaci\u00f3n',
      'tour.step15.sub1.desc': 'Escribe lo que notaste — cualquier cosa.',
      'tour.step15.sub1.voice':'Solo describe lo que notaste. Problemas de equipos, desviaciones de proceso, preocupaciones de seguridad — cualquier cosa. Puedes escribirlo o usar el bot\u00f3n de micr\u00f3fono para dictarlo.',
      'tour.step15.sub2.title':'Establecer Prioridad',
      'tour.step15.sub2.desc': 'M\u00e1rcalo como Bajo, Medio o Alto.',
      'tour.step15.sub2.voice':'Establece la prioridad. Baja, media o alta. Media est\u00e1 seleccionada por defecto, pero si es urgente — m\u00e1rcalo.',
      'tour.step15.sub3.title':'Adjuntar Evidencia',
      'tour.step15.sub3.desc': 'Arrastra fotos o video aqu\u00ed. La evidencia visual ayuda a QA a investigar m\u00e1s r\u00e1pido.',
      'tour.step15.sub3.voice':'Tambi\u00e9n puedes adjuntar fotos o video. Solo arrastra y suelta, o haz clic para explorar. La evidencia visual ayuda a QA a investigar mucho m\u00e1s r\u00e1pido.',
      'tour.step15.sub4.title':'Enviar',
      'tour.step15.sub4.desc': 'Env\u00eda tu observaci\u00f3n an\u00f3nimamente a QA y MSAT.',
      'tour.step15.sub4.voice':'Y eso es todo. Presiona enviar. Tu observaci\u00f3n se env\u00eda directamente a QA y MSAT para revisi\u00f3n. Completamente an\u00f3nimo. Eso es Vent — inteligencia de manufactura, dise\u00f1ado para la planta.',

      // Tour — Step 16: Mi actividad
      'tour.step16.title':     'Mi Actividad',
      'tour.step16.desc':      'Ve todos tus env\u00edos anteriores y sigue su progreso a trav\u00e9s del proceso de revisi\u00f3n.',
      'tour.step16.voice':     'Esto abre tu caj\u00f3n de actividad. Puedes ver todos tus env\u00edos anteriores y seguir exactamente d\u00f3nde est\u00e1 cada uno en el proceso de revisi\u00f3n — desde el env\u00edo inicial hasta la resoluci\u00f3n.',
      'tour.step16.sub1.title':'Mis Env\u00edos',
      'tour.step16.sub1.desc': 'Ve todas tus observaciones anteriores y su estado actual.',
      'tour.step16.sub1.voice':'Esta pesta\u00f1a muestra todos tus env\u00edos anteriores con su estado actual — si est\u00e1n abiertos, en revisi\u00f3n o resueltos.',
      'tour.step16.sub2.title':'Progreso de Cambios',
      'tour.step16.sub2.desc': 'Sigue el proceso completo de revisi\u00f3n para cada observaci\u00f3n.',
      'tour.step16.sub2.voice':'Cambia a esta pesta\u00f1a para ver el proceso completo de cada observaci\u00f3n. Puedes seguir cada etapa desde el env\u00edo hasta la resoluci\u00f3n.',
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  let currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  if (!SUPPORTED.includes(currentLang)) currentLang = DEFAULT_LANG;

  /** Get translated string */
  function t(key, fallback) {
    return (T[currentLang] && T[currentLang][key]) || (T.en && T.en[key]) || fallback || key;
  }

  /** Pluralization: tp('key', 5) → looks up key.one or key.other */
  function tp(key, count) {
    if (currentLang === 'zh') return (t(key + '.other', '') || t(key, '')).replace('{n}', count);
    var suffix = count === 1 ? '.one' : '.other';
    return (t(key + suffix, '') || t(key, '')).replace('{n}', count);
  }

  /** Get current language code */
  function getLang() { return currentLang; }

  /** Get ElevenLabs language code for STT */
  function getSttLangCode() {
    return { en: 'eng', zh: 'cmn', es: 'spa' }[currentLang] || 'eng';
  }

  /** Switch language */
  function setLang(code) {
    if (!SUPPORTED.includes(code)) return;
    currentLang = code;
    localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code === 'zh' ? 'zh-CN' : code;
    applyTranslations();
    updateSwitcherUI();
    window.dispatchEvent(new CustomEvent('ventLangChanged', { detail: { lang: code } }));
  }

  /** Apply translations to all data-i18n elements */
  function applyTranslations() {
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.dataset.i18n;
      var val = t(key);
      if (val !== key) {
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });
    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.dataset.i18nPlaceholder;
      var val = t(key);
      if (val !== key) el.placeholder = val;
    });
    // Aria labels
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
      var key = el.dataset.i18nAria;
      var val = t(key);
      if (val !== key) el.setAttribute('aria-label', val);
    });
    // Title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      var key = el.dataset.i18nTitle;
      var val = t(key);
      if (val !== key) el.title = val;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE SWITCHER WIDGET
  // ═══════════════════════════════════════════════════════════════════════════
  function renderSwitcher(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var titles = { en: 'English', zh: '中文', es: 'Español' };
    container.innerHTML = '<div class="lang-switcher">' +
      SUPPORTED.map(function(code) {
        var active = code === currentLang ? ' lang-active' : '';
        return '<button class="lang-btn' + active + '" data-lang="' + code + '" title="' + titles[code] + '">' + t('lang.' + code) + '</button>';
      }).join('') +
    '</div>';
    // Bind click handlers
    container.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { setLang(btn.dataset.lang); });
    });
  }

  function updateSwitcherUI() {
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.classList.toggle('lang-active', btn.dataset.lang === currentLang);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════════════
  function init() {
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : currentLang;
    applyTranslations();
    renderSwitcher('langSwitcher');
    renderSwitcher('cineLangSwitcher');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ──
  window.VentI18n = { t: t, tp: tp, getLang: getLang, getSttLangCode: getSttLangCode, setLang: setLang, applyTranslations: applyTranslations, renderSwitcher: renderSwitcher };
  window.t = t;
  window.tp = tp;
})();
