export interface ExperienceItem {
  period: string;
  role: string;
  organization: string;
  location: string;
  type: 'Work Experience' | 'Education' | 'Research';
  description: string;
  points: string[];
  techStack: string[];
  link?: string;
}

export const timeline: ExperienceItem[] = [
  {
    period: '2023 — 2027 (Expected)',
    role: 'B.Tech in Computer Science and Engineering',
    organization: 'Dhemaji Engineering College (ASTU)',
    location: 'Assam, India',
    type: 'Education',
    description: 'Undergraduate engineering curriculum emphasizing computer science fundamentals, algorithms, operating systems, database management systems, computer networks, and distributed systems.',
    points: [
      'Focused on backend systems architecture, relational database theory (3NF normalization), and network protocols.',
      'Active developer building production-grade distributed backend tools and resilient microservice architectures.'
    ],
    techStack: ['Data Structures & Algorithms', 'Operating Systems', 'DBMS & SQL', 'Computer Networks', 'Distributed Systems']
  },
  {
    period: '2026',
    role: 'Software Engineering Intern',
    organization: 'Assam Power Generation Corporation Limited (APGCL)',
    location: 'Assam, India',
    type: 'Work Experience',
    description: 'Engineered an administrative enterprise web application and operations portal for Assam\'s state-owned electricity generation corporation.',
    points: [
      'Developed administrative dashboard workflows utilizing PHP, Laravel, and Livewire component architecture.',
      'Implemented secure user authentication and session management for administrative access.',
      'Engineered transactional email verification pipelines and administrative notification handlers.',
      'Organized a structured statutory document repository categorizing tariffs, legislative policies, and RTI disclosures.'
    ],
    techStack: ['PHP', 'Laravel', 'MySQL', 'Livewire', 'Tailwind CSS']
  },
  {
    period: '2024',
    role: 'Computer Vision & AI Researcher',
    organization: 'Associated with National Institute of Technology Silchar (NIT Silchar)',
    location: 'Silchar, Assam',
    type: 'Research',
    description: 'Conducted academic research on automated agricultural foliar disease identification through digital image processing and convolutional representations.',
    points: [
      'Engineered a multi-stage chromatic segmentation pipeline transforming leaf imagery into HSV/LAB color spaces to isolate pathological chlorosis and lesions.',
      'Formulated mathematical morphology techniques (Otsu thresholding, contour extraction) to segment diseased areas from ambient environmental backgrounds.',
      'Built a convolutional deep learning diagnostic classifier to predict specific pathological infections and deliver automated early intervention metrics.'
    ],
    techStack: ['Python 3', 'OpenCV', 'TensorFlow', 'Digital Image Processing', 'NumPy']
  }
];
