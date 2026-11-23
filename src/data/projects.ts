export interface ProjectMetric {
  label: string;
  value: string;
  detail: string;
}

export interface ProjectArchitectureStep {
  step: string;
  name: string;
  description: string;
  technology: string;
}

export interface ProjectCaseStudy {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: 'Distributed Systems' | 'Enterprise Backend' | 'Computer Vision & AI';
  role: string;
  organization?: string;
  period: string;
  featured: boolean;
  githubUrl?: string;
  liveUrl?: string;
  badges: string[];
  summary: string;
  challenge: string;
  architectureNarrative: string;
  architectureSteps: ProjectArchitectureStep[];
  technicalHighlights: {
    title: string;
    description: string;
    codeSnippet?: string;
  }[];
  verifiedClaims: string[];
  stack: {
    runtime: string[];
    dataStores: string[];
    messaging: string[];
    protocols: string[];
    tooling: string[];
  };
  keyFeatures?: {
    label: string;
    detail: string;
  }[];
}

export const projects: ProjectCaseStudy[] = [
  {
    id: 'ai-resilient-gateway',
    slug: 'ai-resilient-gateway',
    title: 'Adaptive AI Gateway & Resilient Workflow Engine',
    tagline: 'Fastify API gateway with BullMQ task queues, stateful Redis circuit breakers, and deterministic SHA-256 prompt caching.',
    category: 'Distributed Systems',
    role: 'Lead Backend Engineer',
    period: '2024',
    featured: true,
    githubUrl: 'https://github.com/MrinmoyBrh/ai-resilient-gateway',
    badges: ['Fastify', 'BullMQ', 'Redis', 'PostgreSQL', 'Circuit Breakers', 'TypeScript'],
    summary: 'A custom API gateway built to keep AI features reliable when upstream providers lag or fail. It queues inference requests in BullMQ, serves identical prompts instantly from a Redis SHA-256 cache in under 5ms, and trips a circuit breaker to switch from Groq to Gemini if errors spike.',
    challenge: 'Direct connections to external AI APIs fail easily in production: sudden rate limits cause HTTP 429 errors, responses occasionally take several seconds, and repetitive queries inflate API bills. I needed an asynchronous gateway that guarantees request delivery, caches answers instantly, and fails over cleanly without manual intervention.',
    architectureNarrative: 'The gateway decouples incoming HTTP requests from AI compute using Fastify and BullMQ. Inbound requests first check tenant quotas, then query a Redis SHA-256 cache. If there is a cache hit, the gateway answers in under 5ms. On a cache miss, the task is saved in PostgreSQL and queued in BullMQ. A Redis circuit breaker monitors provider status, failing over from Groq (Llama 3.3 70B) to Gemini (1.5 Flash) when failure thresholds are crossed.',
    architectureSteps: [
      {
        step: '01',
        name: 'Ingress & Quotas',
        description: 'Validates request bodies with Zod and checks rolling 24-hour token usage per tenant.',
        technology: 'Fastify + PostgreSQL'
      },
      {
        step: '02',
        name: 'Deterministic Cache',
        description: 'Normalizes prompt casing and whitespace, hashes with SHA-256, and queries Redis (<5ms response).',
        technology: 'Node.js Crypto + Redis'
      },
      {
        step: '03',
        name: 'Task Ingestion',
        description: 'Creates a pending job record in PostgreSQL and enqueues the payload into BullMQ with retry backoff.',
        technology: 'BullMQ + Redis Streams'
      },
      {
        step: '04',
        name: 'Circuit Failover',
        description: 'Checks provider state (CLOSED, OPEN, HALF_OPEN) in Redis. Routes to Groq primary or switches to Gemini.',
        technology: 'Redis State Machine'
      },
      {
        step: '05',
        name: 'Telemetry & Events',
        description: 'Logs token usage and latency into PostgreSQL; pushes completion events over Redis Pub/Sub & SSE.',
        technology: 'PostgreSQL + Redis Pub/Sub'
      }
    ],
    technicalHighlights: [
      {
        title: 'Redis Stateful Circuit Breaker',
        description: 'Tracks consecutive upstream errors in Redis. After 3 failures, the circuit trips to OPEN and immediately redirects requests to Gemini without waiting on stalled network connections.',
        codeSnippet: `// Redis-backed Circuit Breaker state query
async getState(): Promise<CircuitState> {
  const state = await redisConnection.get(this.getKey('state'));
  if (!state || state === 'CLOSED') return 'CLOSED';
  if (state === 'OPEN') {
    const openedAt = Number(await redisConnection.get(this.getKey('opened_at'))) || 0;
    if (Date.now() - openedAt > this.cooldownPeriodMs) {
      await redisConnection.set(this.getKey('state'), 'HALF_OPEN');
      return 'HALF_OPEN';
    }
    return 'OPEN';
  }
  return 'HALF_OPEN';
}`
      },
      {
        title: 'Sub-5ms SHA-256 Prompt Caching',
        description: 'Eliminates repetitive inference expenses by computing a deterministic cryptographic hash of the prompt and returning stored results from memory.',
        codeSnippet: `static getCacheKey(prompt: string): string {
  const normalized = prompt.trim().toLowerCase();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return \`cache:prompt:\${hash}\`;
}`
      },
      {
        title: 'Asynchronous Task Queueing',
        description: 'Buffers spikes in client traffic using BullMQ, decoupling client timeout limits from upstream model processing times.',
        codeSnippet: `await aiQueue.add('triage-job', payload, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false,
});`
      }
    ],
    verifiedClaims: [
      'Fastify 5 server with dedicated /jobs and /analytics routes',
      'BullMQ queue running with 5 concurrent workers and exponential backoff retry',
      'Deterministic SHA-256 prompt caching in Redis with 1-hour expiration',
      'Three-state circuit breaker (CLOSED / OPEN / HALF_OPEN) stored in Redis',
      'Automated failover between Groq (Llama 3.3 70B) and Gemini (1.5 Flash)',
      '24-hour rolling token consumption tracking per tenant in PostgreSQL'
    ],
    stack: {
      runtime: ['Node.js', 'TypeScript', 'Fastify v5'],
      dataStores: ['PostgreSQL', 'Redis (ioredis)'],
      messaging: ['BullMQ', 'Redis Pub/Sub', 'Server-Sent Events (SSE)'],
      protocols: ['HTTP/2', 'REST', 'SSE'],
      tooling: ['Docker', 'Zod', 'TSX']
    }
  },
  {
    id: 'apgcl-app',
    slug: 'apgcl-app',
    title: 'APGCL Web Application & Administrative Dashboard',
    tagline: 'Operations portal developed during my internship at Assam Power Generation Corporation Limited.',
    category: 'Enterprise Backend',
    role: 'Software Engineering Intern',
    organization: 'Assam Power Generation Corporation Limited (APGCL)',
    period: '2026',
    featured: true,
    badges: ['Laravel', 'PHP', 'Livewire', 'MySQL', 'Admin Dashboard'],
    summary: 'An internal web application and administrative portal for Assam Power Generation Corporation Ltd. Features secure user authentication, an administrative dashboard, transactional email notifications, and structured archiving for official state electricity filings.',
    challenge: 'State power utility operations need dependable access control, administrative dashboards for daily tasks, and organized public disclosure workflows for regulatory filings and notices.',
    architectureNarrative: 'Built with PHP and Laravel. Administrative workflows are managed through an interactive dashboard with Livewire components. The platform features an automated email verification pipeline and organizes regulatory documents, electricity tariffs, Right to Information (RTI) records, and annual filings into clean scoped routes.',
    architectureSteps: [
      {
        step: '01',
        name: 'User Authentication Gate',
        description: 'Implements user authentication, login workflows, and session management for administrative access.',
        technology: 'Laravel Auth'
      },
      {
        step: '02',
        name: 'Admin Dashboard',
        description: 'Interactive Livewire interfaces for managing utility updates, viewing notifications, and handling administrative tasks.',
        technology: 'Livewire + Blade'
      },
      {
        step: '03',
        name: 'Email Notifications',
        description: 'Dispatches authenticated account verification emails and administrative alert notifications.',
        technology: 'Laravel Mail Pipeline'
      },
      {
        step: '04',
        name: 'Document Archiving',
        description: 'Organized archival subsystem for regulatory tariffs, RTI disclosures, and annual financial statements.',
        technology: 'MySQL + Storage'
      }
    ],
    technicalHighlights: [
      {
        title: 'Authentication & Session Security',
        description: 'Integrated secure authentication middleware and session protection to safeguard administrative access.',
        codeSnippet: `// Authenticated administrative routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::view('dashboard', 'dashboard')->name('dashboard');
});`
      },
      {
        title: 'Statutory Document Routing',
        description: 'Clean prefix routing architecture to manage public electricity tariffs, RTI disclosures, and state policy documents.',
        codeSnippet: `Route::prefix('documents')->name('documents.')->group(function () {
    Route::view('acts-policies', 'pages.documents.acts-policies')->name('acts-policies');
    Route::view('certificates', 'pages.documents.certificates')->name('certificates');
    Route::view('tariff', 'pages.documents.tariff')->name('tariff');
    Route::view('rti', 'pages.documents.rti')->name('rti');
    Route::view('annual-statement', 'pages.documents.annual-statement')->name('annual-statement');
});`
      }
    ],
    verifiedClaims: [
      'Built with PHP and Laravel framework',
      'Administrative dashboard with dynamic Livewire components',
      'Transactional email verification and notifications',
      'Secure administrative authentication and password management',
      'Scoped document management system for electricity tariffs, RTI, and policies'
    ],
    stack: {
      runtime: ['PHP', 'Laravel'],
      dataStores: ['MySQL'],
      messaging: ['Mail Notifications'],
      protocols: ['HTTPS', 'REST'],
      tooling: ['Livewire', 'Tailwind CSS', 'Blade']
    }
  },
  {
    id: 'microbounty',
    slug: 'microbounty',
    title: 'MicroBounty — Sandboxed Code Evaluation & PR Verifier Engine',
    tagline: 'Asynchronous code runner that executes submitted programs in isolated Docker containers.',
    category: 'Distributed Systems',
    role: 'Backend Developer',
    period: '2024',
    featured: true,
    badges: ['Node.js', 'Express', 'Docker', 'BullMQ', 'Redis'],
    summary: 'A code evaluation runner that tests code submissions and pull requests inside isolated Docker containers. Applies resource limits (128MB RAM, 0.5 CPU) and buffers evaluation tasks through BullMQ and Redis queues to maintain a reliable, responsive execution service.',
    challenge: 'Executing submitted code creates resource contention risks like infinite loops and high memory consumption that can degrade host server availability.',
    architectureNarrative: 'An Express gateway buffers incoming evaluation requests into BullMQ queues. Dedicated worker processes spawn temporary Docker containers with memory limits capped at 128MB, CPU throttled, and a strict timeout before returning execution logs and results.',
    architectureSteps: [
      {
        step: '01',
        name: 'Webhook Ingestion',
        description: 'Receives code evaluation triggers from GitHub webhooks or direct API submissions.',
        technology: 'Express + Webhooks'
      },
      {
        step: '02',
        name: 'Queue Buffering',
        description: 'Buffers submissions into BullMQ to prevent sudden bursts of jobs from overwhelming memory.',
        technology: 'BullMQ + Redis'
      },
      {
        step: '03',
        name: 'Isolated Container Execution',
        description: 'Spawns an ephemeral Docker container with memory caps (128MB) and CPU ceilings.',
        technology: 'Docker Engine API'
      }
    ],
    technicalHighlights: [
      {
        title: 'Resource-Constrained Docker Containers',
        description: 'Enforces execution safety by applying strict memory and CPU caps on test runners.',
        codeSnippet: `// Ephemeral container configuration
const container = await docker.createContainer({
  Image: 'sandbox-runner:node',
  HostConfig: {
    Memory: 128 * 1024 * 1024, // 128MB hard cap
    NanoCPUs: 500000000,        // 0.5 CPU cores
    AutoRemove: true
  }
});`
      }
    ],
    verifiedClaims: [
      'Backend service built with Express, BullMQ, and Docker',
      'Asynchronous task buffering via BullMQ and Redis',
      'Isolated Docker container execution with memory and CPU resource caps'
    ],
    stack: {
      runtime: ['Node.js', 'Express'],
      dataStores: ['MongoDB Atlas', 'Redis'],
      messaging: ['BullMQ'],
      protocols: ['GitHub Webhooks', 'Docker Engine API'],
      tooling: ['Docker']
    }
  },
  {
    id: 'personal-note-locker',
    slug: 'personal-note-locker',
    title: 'Personal-Note-Locker',
    tagline: 'RESTful personal note management API with JWT authentication and strict per-user document isolation.',
    category: 'Enterprise Backend',
    role: 'Backend Developer',
    period: '2024',
    featured: false,
    githubUrl: 'https://github.com/MrinmoyBrh/Personal-Note-Locker',
    badges: ['Node.js', 'Express', 'MongoDB', 'Mongoose', 'JWT', 'bcryptjs'],
    summary: 'A secure RESTful note-taking backend built with Node.js, Express, and MongoDB. Enforces strict document-level data isolation so users can only access their own records, protected by stateless JWT authentication middleware and bcrypt password hashing.',
    challenge: 'Multi-user note and document storage systems must guarantee that one authenticated user cannot query, modify, or delete another user\'s private data through ID tampering or unauthorized API requests.',
    architectureNarrative: 'The backend uses an Express router structure with separate authentication and resource management pipelines. Incoming requests to /api/notes pass through a custom JWT middleware that validates Bearer tokens and extracts the authenticated user ID. All subsequent MongoDB queries strictly scope reads and mutations using the verified user ID, preventing cross-tenant data leaks.',
    architectureSteps: [
      {
        step: '01',
        name: 'Authentication Pipeline',
        description: 'Registers users with salted bcrypt password hashing and issues signed JSON Web Tokens upon credential verification.',
        technology: 'Node.js + bcryptjs + JWT'
      },
      {
        step: '02',
        name: 'Bearer Token Middleware',
        description: 'Intercepts incoming HTTP headers, validates JWT signatures, and attaches decoded user identity to request objects.',
        technology: 'Express Middleware'
      },
      {
        step: '03',
        name: 'Scoped CRUD Operations',
        description: 'Enforces document ownership verification on note creation, retrieval, updates, and deletion.',
        technology: 'MongoDB + Mongoose ODM'
      }
    ],
    technicalHighlights: [
      {
        title: 'User-Scoped Document Isolation',
        description: 'Guarantees that database operations always query with the authenticated user ID, blocking horizontal privilege escalation.',
        codeSnippet: `// Scoped note retrieval strictly filtered by authenticated user
router.get('/', protect, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});`
      },
      {
        title: 'Stateless JWT Verification Middleware',
        description: 'Extracts Bearer tokens from the Authorization header, verifies signature against the secret, and injects user identity into req.user.',
        codeSnippet: `const protect = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified.id;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};`
      }
    ],
    verifiedClaims: [
      'Complete REST API built with Express and MongoDB (Mongoose)',
      'Stateless JWT authentication with custom authorization middleware',
      'Document-level user isolation preventing cross-user data access',
      'Secure password hashing with bcryptjs salt rounds'
    ],
    stack: {
      runtime: ['Node.js', 'Express'],
      dataStores: ['MongoDB', 'Mongoose ODM'],
      messaging: [],
      protocols: ['REST', 'HTTP/1.1'],
      tooling: ['dotenv', 'cors', 'Git']
    },
    keyFeatures: [
      {
        label: 'Scoped Data Isolation',
        detail: 'Enforces document ownership checks on all CRUD operations to guarantee per-user data privacy.'
      },
      {
        label: 'Stateless JWT Middleware',
        detail: 'Bearer token middleware protecting endpoints and attaching validated user identity to requests.'
      },
      {
        label: 'Bcrypt Credential Hashing',
        detail: 'Salts and hashes user passwords before persisting credentials to MongoDB.'
      }
    ]
  },
  {
    id: 'crop-disease-detection',
    slug: 'crop-disease-detection',
    title: 'Crop Disease Detection Using Image Processing',
    tagline: 'Academic image-processing pipeline for plant leaf disease analysis, associated with NIT Silchar.',
    category: 'Computer Vision & AI',
    role: 'Research Intern (Computer Vision)',
    organization: 'Associated with National Institute of Technology Silchar (NIT Silchar)',
    period: 'Academic Internship',
    featured: false,
    badges: ['Python', 'OpenCV', 'NumPy', 'Image Processing', 'Color Segmentation'],
    summary: 'An academic image-processing project developed during my research internship associated with the National Institute of Technology Silchar (NIT Silchar). Implements an automated pipeline using Python and OpenCV to detect and analyze plant leaf diseases through chromatic color space transformations and quantitative lesion segmentation.',
    challenge: 'Diagnosing plant pathology in early stages is often complicated by unpredictable outdoor illumination, camera noise, and complex leaf surface textures that obscure infected regions.',
    architectureNarrative: 'The pipeline processes plant leaf captures using digital image processing routines. Bilateral filtering suppresses field speckle noise while preserving sharp lesion boundaries. The image is transformed into HSV and LAB color spaces to segment chlorotic and necrotic tissue from healthy green chlorophyll, followed by morphological contour extraction to calculate quantitative infection ratios.',
    architectureSteps: [
      {
        step: '01',
        name: 'Noise Suppression',
        description: 'Applies bilateral filtering to smooth leaf surface noise while maintaining crisp lesion boundaries.',
        technology: 'OpenCV Bilateral Filter'
      },
      {
        step: '02',
        name: 'Chromatic Color Segmentation',
        description: 'Converts RGB leaf images to HSV and LAB color spaces to isolate diseased foliage from chlorophyll.',
        technology: 'Color Space Transformation'
      },
      {
        step: '03',
        name: 'Morphological Extraction',
        description: 'Extracts connected lesion contours and masks infected surface regions using mathematical morphology.',
        technology: 'Otsu & Morphological Ops'
      },
      {
        step: '04',
        name: 'Area Ratio Scoring',
        description: 'Computes infected surface pixels relative to total leaf contour area for quantitative pathology scoring.',
        technology: 'NumPy Contour Analysis'
      }
    ],
    technicalHighlights: [
      {
        title: 'Chromatic Leaf Segmentation in HSV Space',
        description: 'Decouples color information from light intensity by converting RGB images to HSV space, eliminating shadows and false positives.',
        codeSnippet: `# Chromatic leaf segmentation in HSV space
hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
lower_green = np.array([25, 40, 40])
upper_green = np.array([85, 255, 255])
mask = cv2.inRange(hsv, lower_green, upper_green)
lesion_mask = cv2.bitwise_not(mask)`
      },
      {
        title: 'Quantitative Lesion Area Ratio',
        description: 'Calculates the proportion of damaged leaf tissue against total leaf area to assist severity scoring.',
        codeSnippet: `# Quantitative lesion area ratio calculation
total_leaf_pixels = np.count_nonzero(leaf_contour)
infected_pixels = np.count_nonzero(lesion_mask)
infection_ratio = infected_pixels / max(1, total_leaf_pixels)`
      }
    ],
    verifiedClaims: [
      'Academic image-processing project associated with NIT Silchar internship',
      'Python and OpenCV pipeline using HSV/LAB color transformations and bilateral filtering',
      'Quantitative lesion area ratio computation for disease severity analysis'
    ],
    stack: {
      runtime: ['Python 3'],
      dataStores: ['Local Image Repositories'],
      messaging: [],
      protocols: ['File I/O'],
      tooling: ['OpenCV', 'NumPy', 'Matplotlib']
    },
    keyFeatures: [
      {
        label: 'Color Space Analysis',
        detail: 'Converts RGB leaf captures to HSV and LAB spaces to isolate chlorotic and necrotic lesions.'
      },
      {
        label: 'Bilateral Filtering',
        detail: 'Preserves sharp lesion contours while suppressing surface leaf speckle and lighting noise.'
      },
      {
        label: 'Area Ratio Scoring',
        detail: 'Calculates the ratio of diseased contour pixels against total leaf contour area.'
      }
    ]
  },
  {
    id: 'auth-system',
    slug: 'auth-system',
    title: 'auth-system',
    tagline: 'Two-step authentication backend with time-expiring email OTP verification and guarded JWT issuance.',
    category: 'Enterprise Backend',
    role: 'Backend Developer',
    period: '2024',
    featured: false,
    githubUrl: 'https://github.com/MrinmoyBrh/auth-system',
    badges: ['Node.js', 'Express', 'MongoDB', 'Nodemailer', 'JWT', 'bcryptjs'],
    summary: 'A two-step user authentication backend developed with Node.js, Express, and MongoDB. Enforces email ownership verification by dispatching 6-digit time-expiring OTPs via Nodemailer SMTP, ensuring accounts cannot obtain JWT access tokens until verified.',
    challenge: 'Preventing fake and disposable email registrations requires verifying inbox ownership through automated OTP dispatch before granting authenticated access to application resources.',
    architectureNarrative: 'The service implements a registration pipeline where user records are initially created with an unverified status (isVerified: false). A cryptographically generated 6-digit OTP with a 10-minute expiration timestamp is dispatched via Nodemailer. A dedicated /api/verify-otp endpoint validates the code and promotes the account to verified status, after which the login endpoint permits JWT token issuance.',
    architectureSteps: [
      {
        step: '01',
        name: 'Registration & OTP Generation',
        description: 'Hashes passwords with bcrypt, generates a 6-digit numerical OTP with a 10-minute expiry, and saves user in unverified state.',
        technology: 'Node.js + bcryptjs + Crypto'
      },
      {
        step: '02',
        name: 'SMTP Email Dispatch',
        description: 'Delivers the one-time verification passcode to the user inbox using Nodemailer SMTP transport.',
        technology: 'Nodemailer + SMTP'
      },
      {
        step: '03',
        name: 'OTP Validation & Account Gating',
        description: 'Validates code and timestamp, activates verified status, and authorizes JWT token generation upon login.',
        technology: 'Express + MongoDB + JWT'
      }
    ],
    technicalHighlights: [
      {
        title: 'Time-Limited OTP Verification Flow',
        description: 'Checks that the submitted OTP matches the database record and that the current timestamp is within the 10-minute validity window.',
        codeSnippet: `// Verify OTP endpoint logic
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully!' });
});`
      },
      {
        title: 'Verification-Gated Login & JWT Generation',
        description: 'Enforces that only accounts marked with isVerified: true can authenticate and receive JWT access tokens.',
        codeSnippet: `// Guarded login checking verification status
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  if (!user.isVerified) {
    return res.status(403).json({ message: 'Please verify your email before logging in.' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, message: 'Login successful' });
});`
      }
    ],
    verifiedClaims: [
      'Two-step registration flow with time-expiring email OTP verification',
      'SMTP email delivery pipeline using Nodemailer',
      'Account gating preventing unverified users from acquiring JWT access tokens',
      'Bcrypt password hashing and MongoDB user schema persistence'
    ],
    stack: {
      runtime: ['Node.js', 'Express'],
      dataStores: ['MongoDB', 'Mongoose ODM'],
      messaging: ['Nodemailer SMTP'],
      protocols: ['REST', 'HTTP/1.1'],
      tooling: ['dotenv', 'Git']
    },
    keyFeatures: [
      {
        label: 'Two-Step Verification',
        detail: 'Delivers 6-digit one-time passcodes via Nodemailer SMTP to verify email ownership.'
      },
      {
        label: 'Time-Expiring OTPs',
        detail: 'Automatically invalidates verification codes after a 10-minute validity window.'
      },
      {
        label: 'Access-Guarded Login',
        detail: 'Prevents unverified users from authenticating or acquiring JWT access tokens.'
      }
    ]
  }
];
