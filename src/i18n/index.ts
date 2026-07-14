import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import bn from './bn.json'
import zh from './zh.json'
import ta from './ta.json'

const savedLanguage = localStorage.getItem('language') || 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
      zh: { translation: zh },
      ta: { translation: ta },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
