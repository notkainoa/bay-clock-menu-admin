import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#141414',
          raised: '#1a1a1a',
          inset: '#0c0c0c',
        },
        border: {
          DEFAULT: '#262626',
          subtle: '#1e1e1e',
          focus: '#6ca9ff',
        },
        text: {
          primary: '#e5e5e5',
          secondary: '#737373',
          muted: '#525252',
        },
        accent: {
          DEFAULT: '#6ca9ff',
          hover: '#82b6ff',
          muted: '#6ca9ff20',
        },
        danger: {
          DEFAULT: '#ef4444',
          muted: '#ef444420',
        },
        success: {
          DEFAULT: '#22c55e',
          muted: '#22c55e20',
        },
      },
      fontFamily: {
        display: ['Highway Gothic', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'monospace'],
      },
    },
  },
}
