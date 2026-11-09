import React from 'react';
import { ArrowUp, CaretRight, MusicNotes } from '@phosphor-icons/react';
import { BrandIdentity } from './BrandIdentity.jsx';
import { tr, useLanguage } from './language.js';

export function ClassroomFooter({onOpen, onScores, onCommunity}) {
  useLanguage();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main">
          <div className="footer-about">
            <a className="brand footer-brand" href="#" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});}} aria-label={tr("谱芽岛，返回顶部")}><BrandIdentity/></a>
            <p>{tr("从第一个音符，到第一首完整的歌。")}<br/>{tr("陪你慢慢学，开心唱，自在弹。")}</p>
          </div>
          <div className="footer-links" role="navigation" aria-label={tr("页尾快捷入口")}>
            <div><h2>{tr("开始学音乐")}</h2><button onClick={()=>onOpen({type:'lesson',title:'零基础入门'})}>{tr("零基础入门")}</button><button onClick={()=>onScores()}>{tr("发现好乐谱")}</button><button onClick={()=>onOpen({type:'lesson',title:'我的学习计划'})}>{tr("我的学习计划")}</button></div>
            <div><h2>{tr("遇见音乐同好")}</h2><button onClick={()=>onCommunity()}>{tr("作品社区")}</button><button onClick={()=>{onCommunity('学习交流');}}>{tr("学习交流")}</button><button onClick={()=>onOpen({type:'discussions'})}>{tr("音乐比赛")}</button></div>
          </div>
          <div className="footer-encouragement"><span className="footer-note" aria-hidden="true"><MusicNotes size={24} weight="duotone"/></span><p>{tr("每天一小段，")}<br/><strong>{tr("离喜欢的音乐近一点。")}</strong></p><button onClick={()=>onScores()}>{tr("今天也来练一首 ")}<CaretRight size={15}/></button></div>
        </div>
        <div className="footer-bottom"><small>© {new Date().getFullYear()}{tr(" 谱芽岛 ")}<span>·</span>{tr(" 用音乐记录每一点进步")}</small><span className="footer-demo">{tr("谱面示例 · 社区内容随账号保存")}</span><button className="back-to-top" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>{tr("返回顶部 ")}<ArrowUp size={15}/></button></div>
      </div>
    </footer>
  );
}
