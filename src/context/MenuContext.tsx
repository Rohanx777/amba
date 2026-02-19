import React from 'react';

export const MenuContext = React.createContext({
    isMenuVisible: false,
    toggleMenu: () => { },
    closeMenu: () => { }
});
