import React from 'react';
import { CustomSelect } from './CustomSelect.jsx';
import { Sun, Moon, Desktop, Globe, TextAa, Waves } from '@phosphor-icons/react';
import { languages, setLanguage, tr, useLanguage } from './language.js';
import { useDisplayPreferences } from './display-preferences.js';

export function ProfilePreferences() {
  const language = useLanguage();
  const { theme, textSize, reducedMotion, storageFailed, setPreference } = useDisplayPreferences();
  return <section className="profile-preferences" aria-labelledby="profile-preferences-title">
    <h3 id="profile-preferences-title">{tr('偏好设定')}</h3>
    <p className="preference-intro">{tr('让界面更适合你的阅读和练习习惯。')}</p>
    <div className="preference-row"><div className="preference-label"><Globe size={22}/><label htmlFor="profile-language">{tr('界面语言')}</label></div><CustomSelect id="profile-language" label={tr("界面语言")} value={language} onChange={setLanguage} options={languages.map(item => ({value:item.code,label:item.label}))}/></div>
    <fieldset className="preference-appearance"><legend>{tr('外观模式')}</legend><div className="preference-theme-options">{[{value:'light', label:'日间模式', icon:Sun},{value:'dark',label:'夜间模式',icon:Moon},{value:'system',label:'跟随系统',icon:Desktop}].map(item => <label key={item.value} className={theme === item.value ? 'selected' : ''}><item.icon size={23}/><span>{tr(item.label)}</span><input type="radio" name="display-theme" value={item.value} checked={theme === item.value} onChange={() => setPreference({theme:item.value})}/></label>)}</div></fieldset>
    <div className="preference-row"><div className="preference-label"><TextAa size={22}/><label htmlFor="profile-text-size">{tr('阅读字号')}<small>{tr('调整设置和乐谱列表的文字大小。')}</small></label></div><CustomSelect id="profile-text-size" label={tr("阅读字号")} value={textSize} onChange={value => setPreference({textSize:value})} options={[{value:"standard",label:tr("标准")},{value:"large",label:tr("大字号")}]}/></div>
    <div className="preference-row"><div className="preference-label"><Waves size={22}/><label htmlFor="profile-reduced-motion">{tr('减少动画')}<small>{tr('减少界面过渡与滚动动画。')}</small></label></div><input id="profile-reduced-motion" type="checkbox" role="switch" checked={reducedMotion} onChange={event => setPreference({reducedMotion:event.target.checked})}/></div>
    <p className="preference-storage" role="status">{tr(storageFailed ? '偏好已应用，但当前浏览器无法保存，请检查浏览器存储权限。' : '偏好自动保存在当前浏览器，适用于此设备上的所有账号。')}</p>
  </section>;
}
