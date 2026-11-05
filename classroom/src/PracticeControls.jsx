import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {CaretDown, Check, Metronome, Minus, Plus, Play, Stop} from '@phosphor-icons/react';

function Popover({anchor,open,onClose,dark,side='bottom',label,children,menu=false}) {
  const panel=useRef(null);
  const [placement,setPlacement]=useState(null);
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      const trigger=anchor.current?.getBoundingClientRect(),popup=panel.current;
      if(!trigger||!popup)return;
      const width=Math.min(popup.offsetWidth,window.innerWidth-24),height=popup.offsetHeight;
      const above=side==='top'||trigger.bottom+height+10>window.innerHeight;
      setPlacement({left:Math.max(12,Math.min(trigger.left,window.innerWidth-width-12)),top:Math.max(12,above?trigger.top-height-8:trigger.bottom+8)});
    };
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,side,anchor]);
  useEffect(()=>{
    if(!open)return;
    panel.current?.querySelector('[aria-checked="true"],input,button')?.focus({preventScroll:true});
    const outside=event=>{if(!anchor.current?.contains(event.target)&&!panel.current?.contains(event.target))onClose(false);};
    document.addEventListener('pointerdown',outside,true);
    return()=>document.removeEventListener('pointerdown',outside,true);
  },[open,anchor,onClose]);
  if(!open)return null;
  return createPortal(<div ref={panel} className={`practice-popover ${dark?'practice-popover-dark':''}`} role={menu?'menu':'dialog'} aria-label={label} style={{...placement,visibility:placement?'visible':'hidden'}} onKeyDown={event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose(true);return;}
    const controls=[...panel.current.querySelectorAll('button:not(:disabled),input')];
    if(menu&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();const index=controls.indexOf(document.activeElement);controls[event.key==='Home'?0:event.key==='End'?controls.length-1:(index+(event.key==='ArrowDown'?1:-1)+controls.length)%controls.length]?.focus();
    }
    if(event.key==='Tab'){
      const index=controls.indexOf(document.activeElement);
      if(menu||event.shiftKey&&index===0||!event.shiftKey&&index===controls.length-1){event.preventDefault();event.stopPropagation();onClose(true);}
    }
  }}>{children}</div>,document.body);
}
export function PracticeSelect({id,label,value,options,icon:Icon,dark,openControl,setOpenControl,side}) {
  const trigger=useRef(null),open=openControl===id;
  const close=React.useCallback((restore=false)=>{setOpenControl(null);if(restore)trigger.current?.focus();},[setOpenControl]);
  return <div className={`practice-custom-select practice-select-${id}`}><button ref={trigger} className="practice-select-trigger" aria-label={`${label}：${value}`} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpenControl(open?null:id)} onKeyDown={event=>{
    if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpenControl(id);}
    if(open&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
  }}>{Icon&&<Icon size={20}/>}<span>{value}</span><CaretDown size={13}/></button><Popover anchor={trigger} open={open} onClose={close} dark={dark} side={side} label={label} menu><p className="practice-popover-title">{label}</p>{options.map(option=><button type="button" key={option.value} role="menuitemradio" aria-checked={value===option.value} className="practice-menu-option" onClick={()=>{option.onSelect();close(true);}}><span><strong>{option.value}</strong>{option.description&&<small>{option.description}</small>}</span>{value===option.value&&<Check size={17}/>}</button>)}</Popover></div>;
}
export function PracticeMetronome({bpm,onChange,enabled,onToggle,dark,openControl,setOpenControl}) {
  const trigger=useRef(null),panelWheel=useRef(null),open=openControl==='metronome';
  const close=React.useCallback((restore=false)=>{setOpenControl(null);if(restore)trigger.current?.focus();},[setOpenControl]);
  const adjust=delta=>onChange(Math.max(40,Math.min(180,bpm+delta)));
  useEffect(()=>{
    const element=trigger.current;
    const wheel=event=>{if(!event.deltaY)return;event.preventDefault();adjust(event.deltaY<0?1:-1);};
    element.addEventListener('wheel',wheel,{passive:false});
    return()=>element.removeEventListener('wheel',wheel);
  },[bpm,onChange]);
  useEffect(()=>{
    if(!open)return;const element=panelWheel.current;
    const wheel=event=>{if(!event.deltaY)return;event.preventDefault();adjust(event.deltaY<0?1:-1);};
    element?.addEventListener('wheel',wheel,{passive:false});return()=>element?.removeEventListener('wheel',wheel);
  },[open,bpm,onChange]);
  return <div className="practice-metronome practice-metronome-custom"><button ref={trigger} aria-label="节拍器设置" aria-haspopup="dialog" aria-expanded={open} className={enabled?'enabled':''} onClick={()=>setOpenControl(open?null:'metronome')} onKeyDown={event=>{if(open&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}}}><Metronome size={27}/><span>节拍器<small>♩ = {bpm}</small></span><CaretDown size={12}/></button><Popover anchor={trigger} open={open} onClose={close} dark={dark} side="top" label="节拍器设置"><div ref={panelWheel} className="practice-metronome-panel"><div className="practice-popover-title">节拍器 <span>40–180 BPM</span></div><div className="practice-bpm-adjust"><button aria-label="降低节拍速度" disabled={bpm<=40} onClick={()=>adjust(-1)}><Minus size={18}/></button><div><output aria-live="polite">{bpm}</output><span>BPM</span></div><button aria-label="提高节拍速度" disabled={bpm>=180} onClick={()=>adjust(1)}><Plus size={18}/></button></div><input type="range" aria-label="节拍速度" min="40" max="180" step="1" value={bpm} onChange={event=>onChange(Number(event.target.value))}/><div className="practice-bpm-limits"><span>慢 · 40</span><span>快 · 180</span></div><p className="practice-wheel-tip">悬停后滚动鼠标滚轮，逐拍微调</p><button className="practice-metronome-toggle" aria-pressed={enabled} onClick={onToggle}>{enabled?<Stop size={16} weight="fill"/>:<Play size={16} weight="fill"/>}{enabled?'停止节拍器':'开启节拍器'}</button></div></Popover></div>;
}
