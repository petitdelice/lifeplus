import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const svg = (size: number, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  ...rest,
});

export const Spark = ({ size = 18, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4Z" fill="currentColor" />
  </svg>
);

export const Flame = ({ size = 18, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M12 2c1 4 6 6 6 11a6 6 0 0 1-12 0c0-2.5 1.2-4.2 2.5-5.3 0 2.2 1 3.3 2.2 3.3C10.7 7.8 10 5.5 12 2z" fill="currentColor" />
  </svg>
);

export const Check = ({ size = 22, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Plus = ({ size = 24, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const Bag = ({ size = 24, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M4 9h16l-1.5 11h-13zM8 9V7a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Path = ({ size = 24, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M4 19c4 0 3-6 8-6s4-6 8-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="4" cy="19" r="2" fill="currentColor" />
    <circle cx="20" cy="7" r="2" fill="currentColor" />
  </svg>
);

export const User = ({ size = 24, ...p }: P) => (
  <svg {...svg(size, p)}>
    <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
    <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const Lock = ({ size = 18, ...p }: P) => (
  <svg {...svg(size, p)}>
    <rect x="5" y="11" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const Snow = ({ size = 18, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Ticket = ({ size = 18, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" fill="currentColor" />
  </svg>
);

export const Close = ({ size = 20, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

export const Coffee = ({ size = 22, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Trash = ({ size = 18, ...p }: P) => (
  <svg {...svg(size, p)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
