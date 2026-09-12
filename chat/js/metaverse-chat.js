import { createHomepageChat } from './homepage-chat.js';

createHomepageChat({
  rootId: 'metaverseChat',
  messagesId: 'metaverseChatMessages',
  formId: 'metaverseChatForm',
  nicknameId: 'metaverseChatNickname',
  pinId: 'metaverseChatPin',
  inputId: 'metaverseChatInput',
  channel: 'metaverse',
  sharedRoomId: 'lobby',
  sharedRoomTitle: 'METAVERSE',
  emptyRoomText: '메시지를 남겨주세요.'
});

createHomepageChat({
  rootId: 'extraChat',
  messagesId: 'extraChatMessages',
  formId: 'extraChatForm',
  nicknameId: 'extraChatNickname',
  pinId: 'extraChatPin',
  inputId: 'extraChatInput',
  channel: 'extra',
  sharedRoomId: 'lobby',
  sharedRoomTitle: 'EXTRA',
  emptyRoomText: '메시지를 남겨주세요.'
});
