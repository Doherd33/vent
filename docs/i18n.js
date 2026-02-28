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
