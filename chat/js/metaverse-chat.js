import { createHomepageChat } from './homepage-chat.js';

createHomepageChat({
  rootId: 'metaverseChat',
  messagesId: 'metaverseChatMessages',
  formId: 'metaverseChatForm',
  nicknameId: 'metaverseChatNickname',
  pinId: 'metaverseChatPin',
  inputId: 'metaverseChatInput',
  channel: 'metaverse',
  projectEventName: 'rabbit-metaverse-chat-project',
  emptyRoomText: '프로젝트를 선택하면 채팅이 표시됩니다.'
});

createHomepageChat({
  rootId: 'extraChat',
  messagesId: 'extraChatMessages',
  formId: 'extraChatForm',
  nicknameId: 'extraChatNickname',
  pinId: 'extraChatPin',
  inputId: 'extraChatInput',
  channel: 'extra',
  projectEventName: 'rabbit-extra-chat-project',
  emptyRoomText: '프로젝트를 선택하면 채팅이 표시됩니다.'
});
