import React, { useEffect, useRef } from 'react';
import { Check, Minus } from '@phosphor-icons/react';
import './favorites-checkbox.css';

export function FavoritesCheckbox({ className = '', indeterminate = false, children, ...props }) {
  const input = useRef(null);
  useEffect(() => { input.current.indeterminate = indeterminate; }, [indeterminate, props.checked]);
  return <label className={`favorites-checkbox ${className}`}>
    <input {...props} ref={input} type="checkbox"/>
    <span className="favorites-checkbox-box" aria-hidden="true"><Check className="favorites-checkbox-check" size={16} weight="bold"/><Minus className="favorites-checkbox-minus" size={16} weight="bold"/></span>
    {children && <span>{children}</span>}
  </label>;
}
