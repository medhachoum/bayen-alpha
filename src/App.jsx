import React, { useState, useEffect, useRef } from 'react';
import { FiMenu, FiPlus, FiSend, FiEdit2, FiTrash2, FiCopy, FiSquare, FiArchive, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { FaHandPaper, FaBriefcase, FaBalanceScale, FaQuestion } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

function App() {
  const [conversations, setConversations] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false); // لعرض مؤشر الكتابة
  const [showConversationList, setShowConversationList] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load conversations from localStorage on initial render
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      try {
        const parsedConversations = JSON.parse(savedConversations);
        setConversations(parsedConversations);
        
        // Get the last active conversation
        const lastActiveId = localStorage.getItem('activeConversationId');
        if (lastActiveId && parsedConversations[lastActiveId]) {
          setActiveConversationId(lastActiveId);
          setMessages(parsedConversations[lastActiveId].messages);
          setShowWelcome(false);
        } else {
          // Create a new conversation if no active one exists
          createNewConversation();
        }
      } catch (error) {
        console.error('Error parsing saved conversations:', error);
        createNewConversation();
      }
    } else {
      createNewConversation();
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(conversations).length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
    
    if (activeConversationId) {
      localStorage.setItem('activeConversationId', activeConversationId);
    }
  }, [conversations, activeConversationId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Create a new conversation
  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation = {
      id: newId,
      title: `محادثة ${Object.keys(conversations).length + 1}`,
      timestamp: new Date().toISOString(),
      messages: []
    };
    
    setConversations(prevConversations => ({
      ...prevConversations,
      [newId]: newConversation
    }));
    
    setActiveConversationId(newId);
    setMessages(newConversation.messages);
    setShowConversationList(false);
    setShowWelcome(true);
    setSelectedCategory(null);
  };
  // Switch to a different conversation
  const switchConversation = (conversationId) => {
    if (conversations[conversationId]) {
      setActiveConversationId(conversationId);
      setMessages(conversations[conversationId].messages);
      setShowConversationList(false);
      setShowWelcome(conversations[conversationId].messages.length === 0);
    }
  };

  // Update the conversation title based on first user message
  const updateConversationTitle = (conversationId, messages) => {
    // Find the first user message to use as the title
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    
    if (firstUserMessage && firstUserMessage.content) {
      // Limit title length
      let title = firstUserMessage.content.substring(0, 30);
      if (firstUserMessage.content.length > 30) {
        title += '...';
      }
      
      setConversations(prevConversations => ({
        ...prevConversations,
        [conversationId]: {
          ...prevConversations[conversationId],
          title
        }
      }));
    }
  };

  // Delete the active conversation
  const deleteActiveConversation = () => {
    if (!activeConversationId) return;
    
    setConversations(prevConversations => {
      const newConversations = { ...prevConversations };
      delete newConversations[activeConversationId];
      return newConversations;
    });
    
    // Switch to another conversation or create new one
    const remainingIds = Object.keys(conversations).filter(id => id !== activeConversationId);
    if (remainingIds.length > 0) {
      switchConversation(remainingIds[0]);
    } else {
      createNewConversation();
    }
  };

  // Delete a conversation from the list
  const deleteConversation = (e, conversationId) => {
    e.stopPropagation(); // Prevent triggering switchConversation
    
    setConversations(prevConversations => {
      const newConversations = { ...prevConversations };
      delete newConversations[conversationId];
      return newConversations;
    });
    
    // If we're deleting the active conversation, switch to another one or create new
    if (conversationId === activeConversationId) {
      const remainingIds = Object.keys(conversations).filter(id => id !== conversationId);
      if (remainingIds.length > 0) {
        switchConversation(remainingIds[0]);
      } else {
        createNewConversation();
      }
    }
  };

  // Delete a message
  const deleteMessage = (indexToDelete) => {
    // Can't delete if we're currently loading a response
    if (isLoading) return;

    const updatedMessages = messages.filter((_, index) => index !== indexToDelete);
    
    setMessages(updatedMessages);
    
    // Update conversation with deleted message
    setConversations(prevConversations => ({
      ...prevConversations,
      [activeConversationId]: {
        ...prevConversations[activeConversationId],
        messages: updatedMessages
      }
    }));
  };

  // Start editing a message
  const startEditMessage = (index) => {
    // Can't edit if we're currently loading a response
    if (isLoading) return;
    
    setEditingMessageIndex(index);
    setEditedContent(messages[index].content);
  };

  // Save edited message
  const saveEditedMessage = () => {
    const updatedMessages = [...messages];
    updatedMessages[editingMessageIndex] = {
      ...updatedMessages[editingMessageIndex],
      content: editedContent
    };
    
    setMessages(updatedMessages);
    
    // Update conversation with edited message
    setConversations(prevConversations => ({
      ...prevConversations,
      [activeConversationId]: {
        ...prevConversations[activeConversationId],
        messages: updatedMessages
      }
    }));
    
    // Clear editing state
    setEditingMessageIndex(null);
    setEditedContent('');
  };
  // Cancel message editing
  const cancelEditMessage = () => {
    setEditingMessageIndex(null);
    setEditedContent('');
  };

  // Copy message content to clipboard
  const copyMessageContent = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      alert('تم نسخ النص إلى الحافظة');
    });
  };

  // Stop the current response generation
  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Handle key press in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Select a category from welcome screen
  const selectCategory = (category) => {
    setSelectedCategory(category);
    // Set the input to a suggested prompt based on category
    let prompt = '';
    switch(category) {
      case 'business':
        prompt = 'اشرح لي كيفية تأسيس شركة في المملكة العربية السعودية';
        break;
      case 'legal':
        prompt = 'ما هي الإجراءات القانونية للتعاقد مع مورد خارجي؟';
        break;
      case 'saudi':
        prompt = 'اشرح لي قوانين العمل في المملكة العربية السعودية';
        break;
      default:
        prompt = '';
    }
    setInput(prompt);
    setShowWelcome(false);
  };

  // Handle submitting a new message
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || !activeConversationId) return;
    
    // Create a new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);
    
    // Add user message
    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    
    // Update local state
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setShowWelcome(false);
    setShowTypingIndicator(true); // Show typing indicator
    
    // Update conversation with the user message
    setConversations(prevConversations => ({
      ...prevConversations,
      [activeConversationId]: {
        ...prevConversations[activeConversationId],
        messages: newMessages,
        timestamp: new Date().toISOString()
      }
    }));
    
    // Update the conversation title if this is the first user message
    if (messages.filter(msg => msg.role === 'user').length === 0) {
      updateConversationTitle(activeConversationId, newMessages);
    }
    
    try {
      // Format messages for backend - ensuring proper alternation
      let formattedMessages = [];
      
      // تم حذف إضافة نظام البرومبت من هنا ليتم إضافته في الـ backend
      
      // نحصل على تاريخ المحادثة باستثناء الرسالة الحالية
      const historicalMessages = [...messages];
      
      // تحديد رسائل المستخدم والمساعد في المحادثة السابقة
      const prevUserMessages = historicalMessages.filter(msg => msg.role === 'user');
      const prevAssistantMessages = historicalMessages.filter(msg => msg.role === 'assistant');
      
      // ضمان أن لدينا تناوب صحيح (user -> assistant -> user -> ...)
      const maxPairs = Math.min(prevUserMessages.length, prevAssistantMessages.length);
      
      for (let i = 0; i < maxPairs; i++) {
        // إضافة زوج من الرسائل (مستخدم ثم مساعد)
        formattedMessages.push(prevUserMessages[i]);
        formattedMessages.push(prevAssistantMessages[i]);
      }
      
      // إذا كان هناك رسائل مستخدم إضافية، نضيف آخر واحدة فقط
      if (prevUserMessages.length > maxPairs) {
        formattedMessages.push(prevUserMessages[prevUserMessages.length - 1]);
      }
      
      // إضافة الرسالة الحالية من المستخدم دائماً في النهاية
      // إذا كانت آخر رسالة مضافة هي من مستخدم، نزيل الرسالة قبل إضافة الرسالة الجديدة
      const lastFormattedMsg = formattedMessages[formattedMessages.length - 1];
      if (lastFormattedMsg && lastFormattedMsg.role === 'user') {
        formattedMessages.pop();
      }
      
      // الآن نضيف الرسالة الجديدة
      formattedMessages.push(userMessage);
      
      console.log('Sending to backend:', formattedMessages);
      
      // Eliminar la creación del mensaje asistente vacío
      // --- ELIMINADO ---
      // const assistantMessage = { role: 'assistant', content: '' };
      // const updatedMessages = [...newMessages, assistantMessage];
      // setMessages(updatedMessages);
      // setConversations(prevConversations => ({
      //   ...prevConversations,
      //   [activeConversationId]: {
      //     ...prevConversations[activeConversationId],
      //     messages: updatedMessages
      //   }
      // }));
      
      // Send to backend with abort signal
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: formattedMessages 
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Process streaming response
      const reader = response.body.getReader();
      let done = false;
      let isFirstChunk = true;
      let assistantResponse = '';
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunk = new TextDecoder().decode(value);
          console.log('Received chunk:', chunk);
          
          assistantResponse += chunk;
          
          // Si es el primer fragmento, crear el mensaje del asistente
          if (isFirstChunk) {
            // Crear el mensaje del asistente con el primer fragmento
            const assistantMessage = { role: 'assistant', content: assistantResponse };
            const updatedMessages = [...newMessages, assistantMessage];
            
            setMessages(updatedMessages);
            setShowTypingIndicator(false);
            
            // Actualizar la conversación con el mensaje del asistente
            setConversations(prevConversations => ({
              ...prevConversations,
              [activeConversationId]: {
                ...prevConversations[activeConversationId],
                messages: updatedMessages
              }
            }));
            
            isFirstChunk = false;
          } else {
            // Actualizar el mensaje existente del asistente
            setMessages(current => {
              const updated = [...current];
              const lastMessage = updated[updated.length - 1];
              
              const updatedMessage = {
                ...lastMessage,
                content: assistantResponse
              };
              updated[updated.length - 1] = updatedMessage;
              
              // Actualizar la conversación con el mensaje actualizado
              setConversations(prevConversations => ({
                ...prevConversations,
                [activeConversationId]: {
                  ...prevConversations[activeConversationId],
                  messages: updated
                }
              }));
              
              return updated;
            });
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Error:', error);
      const errorMessage = { role: 'assistant', content: `حدث خطأ في الاتصال: ${error.message}` };
      const updatedMessages = [...newMessages, errorMessage];
      
      setMessages(updatedMessages);
      
      // Update conversation with the error message
      setConversations(prevConversations => ({
        ...prevConversations,
        [activeConversationId]: {
          ...prevConversations[activeConversationId],
          messages: updatedMessages
        }
      }));
    } finally {
      setIsLoading(false);
      setAbortController(null);
      setShowTypingIndicator(false); // Hide typing indicator
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', { 
      day: 'numeric', 
      month: 'short',
      hour: 'numeric', 
      minute: 'numeric' 
    }).format(date);
  };

  // مكون لعرض محتوى الرسالة مع دعم فصل جزء التفكير
  const MessageContent = ({ content }) => {
    const [isThinkingCollapsed, setIsThinkingCollapsed] = useState(false);
    
    // فحص إذا كانت الرسالة تحتوي على جزء التفكير
    const hasThinkingSection = content && content.includes('<think>') && content.includes('</think>');
    
    if (!hasThinkingSection) {
      // إذا لم تكن الرسالة تحتوي على جزء التفكير، يتم عرضها كما هي
      return (
        <ReactMarkdown
          children={content}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
        />
      );
    }
    
    // استخراج جزء التفكير والرد النهائي
    const thinkingMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : '';
    
    // الحصول على الرد النهائي (المحتوى بعد وسم </think>)
    const finalResponseStart = content.indexOf('</think>') + '</think>'.length;
    const finalResponse = content.substring(finalResponseStart).trim();
    
    return (
      <div className="message-content-wrapper">
        {thinkingContent && (
          <div className="thinking-section">
            <div 
              className="thinking-header" 
              onClick={() => setIsThinkingCollapsed(!isThinkingCollapsed)}
            >
              <div className="thinking-icon">
                {isThinkingCollapsed ? <FiChevronRight /> : <FiChevronDown />}
              </div>
              <div className="thinking-title">تفكير المساعد</div>
            </div>
            
            {!isThinkingCollapsed && (
              <div className="thinking-content">
                <ReactMarkdown
                  children={thinkingContent}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                />
              </div>
            )}
          </div>
        )}
        
        <div className="final-response">
          <ReactMarkdown
            children={finalResponse}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar with conversation list */}
      <div className={`conversation-sidebar ${showConversationList ? 'show' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-title-sidebar">بَيِّن</div>
          <button className="new-chat-button" onClick={createNewConversation}>
            <FiPlus />
            محادثة جديدة
          </button>
        </div>
        
        {/* Conversation list */}
        <div className="conversation-list">
          {Object.values(conversations)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(conversation => (
              <div 
                key={conversation.id}
                className={`conversation-item ${conversation.id === activeConversationId ? 'active' : ''}`}
                onClick={() => switchConversation(conversation.id)}
              >
                <div className="conversation-info">
                  <div className="conversation-title">{conversation.title}</div>
                  <div className="conversation-date">{formatDate(conversation.timestamp)}</div>
                </div>
                <button 
                  className="delete-conversation"
                  onClick={(e) => deleteConversation(e, conversation.id)}
                  aria-label="حذف المحادثة"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="chat-container">
        {/* Chat header */}
        <div className="chat-header">
          <button 
            className="menu-button"
            onClick={() => setShowConversationList(!showConversationList)}
            aria-label="قائمة المحادثات"
          >
            <FiMenu size={24} />
          </button>
          
          <h1>
            {activeConversationId && conversations[activeConversationId]
              ? conversations[activeConversationId].title
              : 'محادثة جديدة'}
          </h1>
          
          <button 
            className="delete-chat-button"
            onClick={deleteActiveConversation}
            aria-label="حذف المحادثة الحالية"
          >
            <FiTrash2 />
            حذف
          </button>
        </div>
        
        {/* Messages area */}
        <div className="messages-container">
          {showWelcome ? (
            <div className="welcome-view">
              <div className="welcome-icon">
                <FaHandPaper size={36} />
              </div>
              <h2 className="welcome-title">مرحباً بك!</h2>
              <p className="welcome-subtitle">
                أنا بَيِّن، مساعدك القانوني الذكي. أستطيع مساعدتك في استفساراتك القانونية وتقديم المعلومات التي تحتاجها.
              </p>
              
              <div className="categories-container">
                <div className="category-card" onClick={() => selectCategory('business')}>
                  <div className="category-icon">
                    <FaBriefcase size={24} />
                  </div>
                  <div className="category-title">قانون الأعمال والشركات</div>
                  <div className="category-description">استفسارات حول تأسيس الشركات والعقود التجارية</div>
                </div>
                
                <div className="category-card" onClick={() => selectCategory('legal')}>
                  <div className="category-icon">
                    <FaBalanceScale size={24} />
                  </div>
                  <div className="category-title">القانون والتعاقد</div>
                  <div className="category-description">أسئلة حول الإجراءات القانونية والعقود</div>
                </div>
                
                <div className="category-card" onClick={() => selectCategory('saudi')}>
                  <div className="category-icon">
                    <FaQuestion size={24} />
                  </div>
                  <div className="category-title">أسئلة حول قوانين المملكة</div>
                  <div className="category-description">استفسارات عن القوانين في المملكة العربية السعودية</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Message list */}
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'} ${editingMessageIndex === index ? 'editing-message' : ''}`}
                >
                  <div className="message-avatar">
                    {message.role === 'user' ? 'أ' : 'ب'}
                  </div>
                  
                  {editingMessageIndex === index ? (
                    <div className="edit-message-form">
                      <textarea 
                        className="edit-message-textarea"
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                      />
                      <div className="edit-buttons">
                        <button className="edit-cancel-button" onClick={cancelEditMessage}>إلغاء</button>
                        <button className="edit-save-button" onClick={saveEditedMessage}>حفظ</button>
                      </div>
                    </div>
                  ) : (
                    <div className="message-content">
                      <MessageContent content={message.content} />
                      
                      {/* Message actions */}
                      <div className="message-actions">
                        {message.role === 'user' && (
                          <button 
                            className="message-action-button" 
                            onClick={() => startEditMessage(index)}
                            aria-label="تعديل الرسالة"
                          >
                            <FiEdit2 size={16} />
                          </button>
                        )}
                        <button 
                          className="message-action-button" 
                          onClick={() => copyMessageContent(message.content)}
                          aria-label="نسخ المحتوى"
                        >
                          <FiCopy size={16} />
                        </button>
                        <button 
                          className="message-action-button" 
                          onClick={() => deleteMessage(index)}
                          aria-label="حذف الرسالة"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing indicator */}
              {showTypingIndicator && (
                <div className="message assistant-message">
                  <div className="message-avatar">ب</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* For scrolling to bottom */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        
        {/* Input area */}
        <form className="input-form" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className="message-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="اكتب رسالتك هنا..."
            disabled={isLoading}
          />
          <div className="input-buttons">
            {isLoading ? (
              <button 
                type="button" 
                className="stop-button"
                onClick={stopGeneration}
                aria-label="إيقاف الإجابة"
              >
                <FiSquare size={20} />
              </button>
            ) : (
              <button 
                type="submit" 
                className="send-button"
                disabled={!input.trim()}
                aria-label="إرسال"
              >
                <FiSend size={20} />
              </button>
            )}
          </div>
        </form>
        
        
      </div>
    </div>
  );
}

export default App;
