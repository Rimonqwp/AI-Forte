import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import './custom-select.css';

// Keep the popup in the same DOM subtree as its form/dialog. The popover top
// layer lets it escape scrolling panels without breaking modal focus containment.
export function CustomSelect({ id, label, options, value, defaultValue, onChange, name, placeholder = '请选择', className = '', disabled = false }) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const trigger = useRef(null), panel = useRef(null), search = useRef({ text: '', time: 0 });
  const items = options.map(option => typeof option === 'string' ? { value: option, label: option } : option);
  const [internalValue, setInternalValue] = useState(defaultValue ?? items.find(item => !item.disabled)?.value ?? '');
  const selectedValue = value === undefined ? internalValue : value;
  const selected = items.find(item => item.value === selectedValue);
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const enabled = items.map((item, index) => item.disabled ? -1 : index).filter(index => index >= 0);
  const close = () => setOpen(false);
  const choose = index => {
    if (!items[index] || items[index].disabled) return;
    setInternalValue(items[index].value);
    onChange?.(items[index].value);
    close();
    trigger.current?.focus({ preventScroll: true });
  };
  const expand = (last = false) => {
    if (disabled || !enabled.length) return;
    setActive(selected && !selected.disabled ? items.indexOf(selected) : last ? enabled.at(-1) : enabled[0]);
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const popup = panel.current;
    popup.showPopover?.();
    const place = () => {
      const rect = trigger.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft || 0) + 12, topEdge = (viewport?.offsetTop || 0) + 12;
      const rightEdge = leftEdge + (viewport?.width || window.innerWidth) - 24;
      const bottomEdge = topEdge + (viewport?.height || window.innerHeight) - 24;
      const below = bottomEdge - rect.bottom - 6, above = rect.top - topEdge - 6;
      const upward = below < Math.min(popup.scrollHeight, 280) && above > below;
      const width = Math.min(Math.max(rect.width, 176), rightEdge - leftEdge);
      popup.style.width = `${width}px`;
      popup.style.maxHeight = `${Math.max(40, Math.min(280, upward ? above : below))}px`;
      popup.style.left = `${Math.max(leftEdge, Math.min(rect.left, rightEdge - width))}px`;
      popup.style.top = `${Math.max(topEdge, upward ? rect.top - popup.offsetHeight - 6 : rect.bottom + 6)}px`;
    };
    place();
    const scroll = event => { if (!popup.contains(event.target)) place(); };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', scroll, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      popup.hidePopover?.();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', scroll, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [open]);
  useEffect(() => {
    if (open) panel.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!trigger.current?.contains(event.target) && !panel.current?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); };
  }, [open]);
  useEffect(() => {
    const form = trigger.current?.form;
    const reset = () => { setInternalValue(defaultValue ?? items.find(item => !item.disabled)?.value ?? ''); close(); };
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [defaultValue, options]);
  useEffect(() => { if (disabled) close(); }, [disabled]);

  return <span className={`custom-select ${className}`}>
    {name && <input type="hidden" name={name} value={selectedValue} disabled={disabled}/>}
    <button id={controlId} ref={trigger} type="button" className="custom-select-trigger" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${controlId}-options`} aria-activedescendant={open && active >= 0 ? `${controlId}-option-${active}` : undefined} disabled={disabled} onClick={() => open ? close() : expand()} onKeyDown={event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key === 'Tab') { close(); return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        if (!open) {
          expand(event.key === 'ArrowUp' || event.key === 'End');
          if (event.key === 'Home') setActive(enabled[0]);
          if (event.key === 'End') setActive(enabled.at(-1));
          return;
        }
        const index = enabled.indexOf(active);
        setActive(event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]);
      } else if ((event.key === 'Enter' || event.key === ' ') && open) {
        event.preventDefault(); event.stopPropagation(); choose(active);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
        event.preventDefault();
        const text = Date.now() - search.current.time > 700 ? event.key : search.current.text + event.key;
        search.current = { text: text.toLocaleLowerCase(), time: Date.now() };
        const match = enabled.find(index => String(items[index].label).toLocaleLowerCase().startsWith(search.current.text));
        if (!open) expand();
        if (match !== undefined) setActive(match);
      }
    }}><span>{selected?.label ?? placeholder}</span><CaretDown size={14} aria-hidden="true"/></button>
    {open && <span ref={panel} id={`${controlId}-options`} popover="manual" role="listbox" aria-label={label} className={`custom-select-menu ${className}`} onPointerDown={event => event.preventDefault()} onClick={event => { event.preventDefault(); event.stopPropagation(); }}>
      {items.map((item, index) => <button key={item.value} id={`${controlId}-option-${index}`} type="button" role="option" tabIndex={-1} data-index={index} aria-selected={item.value === selectedValue} disabled={item.disabled} className={`custom-select-option ${active === index ? 'is-active' : ''}`} onPointerMove={() => !item.disabled && setActive(index)} onClick={() => choose(index)}><span>{item.label}</span>{item.value === selectedValue && <Check size={16} aria-hidden="true"/>}</button>)}
    </span>}
  </span>;
}
