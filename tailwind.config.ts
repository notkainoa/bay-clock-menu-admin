import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        ink: '#f4efe4',
        chalk: '#cec7bb',
        void: '#101010',
        panel: '#171717',
        line: '#d8d2c7',
        moss: '#3da24d',
        rose: '#eb8d90',
      },
      boxShadow: {
        glow: '0 20px 80px rgba(0, 0, 0, 0.35)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        display: ['Highway Gothic', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        hand: ['Patrick Hand', 'cursive'],
      },
    },
  },
}
