import React, { useState, useEffect } from 'react';
import './FloatingChat.css';
import ChatBox from './ChatBox';

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);

  useEffect(() => {
    window.openSupportChat = openChat;
    return () => {
      if (window.openSupportChat === openChat) {
        delete window.openSupportChat;
      }
    };
  }, []);

  return (
    <>
      <ChatBox isOpen={isOpen} onClose={closeChat} />
    </>
  );
};

export default FloatingChat;
