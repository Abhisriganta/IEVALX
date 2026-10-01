// ============================================================================
// liveChat.mock.js — Mock data for Live Chat section
// (Instant Chat only)
// Location: src/mocks/jobseeker/liveChat.mock.js
// ============================================================================

export const instantChatConversationsMock = [
  {
    id: 'conv-001',
    name: 'Priya Sharma',
    role: 'Recruiter - TechCorp Solutions',
    avatarBg: '#1E3358',
    online: true,
    lastMessage: 'Looking forward to our chat tomorrow at 3 PM.',
    lastMessageAt: '2026-04-29T11:45:00Z',
    unreadCount: 2,
    company: 'TechCorp Solutions',
  },
  {
    id: 'conv-002',
    name: 'Rajesh Kumar',
    role: 'Engineering Manager - InnovateLabs',
    avatarBg: '#2A4A7F',
    online: false,
    lastMessage: 'Thanks for the resume. We will get back to you by Friday.',
    lastMessageAt: '2026-04-28T17:20:00Z',
    unreadCount: 0,
    company: 'InnovateLabs',
  },
  {
    id: 'conv-003',
    name: 'Sneha Patel',
    role: 'Hiring Lead - CloudNative Inc.',
    avatarBg: '#395B8C',
    online: true,
    lastMessage: 'Sure, I can share more about the role.',
    lastMessageAt: '2026-04-27T09:10:00Z',
    unreadCount: 1,
    company: 'CloudNative Inc.',
  },
  {
    id: 'conv-004',
    name: 'Vikram Iyer',
    role: 'CTO - DataStream Co.',
    avatarBg: '#5A7BAA',
    online: false,
    lastMessage: 'Your application is under review.',
    lastMessageAt: '2026-04-25T14:32:00Z',
    unreadCount: 0,
    company: 'DataStream Co.',
  },
];

export const instantChatMessagesMock = {
  'conv-001': [
    { id: 'mc1-001', from: 'them', text: 'Hi Akhil! Saw your application for the Senior React Developer role.', timestamp: '2026-04-29T10:30:00Z' },
    { id: 'mc1-002', from: 'me',   text: 'Hi Priya, thanks for reaching out!',                                       timestamp: '2026-04-29T10:32:00Z' },
    { id: 'mc1-003', from: 'them', text: 'Could we schedule a quick intro call? Tomorrow afternoon works for me.',   timestamp: '2026-04-29T10:33:00Z' },
    { id: 'mc1-004', from: 'me',   text: 'Sure, 3 PM IST works.',                                                    timestamp: '2026-04-29T11:40:00Z' },
    { id: 'mc1-005', from: 'them', text: 'Looking forward to our chat tomorrow at 3 PM.',                            timestamp: '2026-04-29T11:45:00Z' },
  ],
  'conv-002': [
    { id: 'mc2-001', from: 'me',   text: 'Hi Rajesh, attaching my updated resume for the FS role.', timestamp: '2026-04-28T16:50:00Z' },
    { id: 'mc2-002', from: 'them', text: 'Thanks for the resume. We will get back to you by Friday.', timestamp: '2026-04-28T17:20:00Z' },
  ],
  'conv-003': [
    { id: 'mc3-001', from: 'them', text: 'Hi! Are you still open to backend roles?',     timestamp: '2026-04-27T09:00:00Z' },
    { id: 'mc3-002', from: 'me',   text: 'Yes, very much. What do you have in mind?',   timestamp: '2026-04-27T09:05:00Z' },
    { id: 'mc3-003', from: 'them', text: 'Sure, I can share more about the role.',      timestamp: '2026-04-27T09:10:00Z' },
  ],
  'conv-004': [
    { id: 'mc4-001', from: 'me',   text: 'Following up on the Frontend Engineer position.', timestamp: '2026-04-25T14:25:00Z' },
    { id: 'mc4-002', from: 'them', text: 'Your application is under review.',                timestamp: '2026-04-25T14:32:00Z' },
  ],
};
