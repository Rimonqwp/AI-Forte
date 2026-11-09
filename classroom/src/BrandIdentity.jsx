import React from 'react';
import { tr } from './language.js';
import './brand-identity.css';

export function BrandIdentity({ showTagline = true }) {
  return <>
    <img className="brand-logo" src={import.meta.env.BASE_URL + 'assets/brand/puyadao-sprout-icon.png'} width="46" height="46" alt={tr('谱芽岛')}/>
    <span className="brand-copy"><strong>{tr('谱芽岛')}</strong>{showTagline && <small>{tr('让喜欢的歌，在指尖靠岸。')}</small>}</span>
  </>;
}
