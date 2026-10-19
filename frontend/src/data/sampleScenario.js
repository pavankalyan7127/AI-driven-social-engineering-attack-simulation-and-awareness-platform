/**
 * Sample Scenario data matching the reference screenshots
 * Channel: Email
 * Scenario: VIT Events Phishing & Credential Reset Simulation
 */

export const sampleScenario = {
  scenarioId: "scen-phish-vit-events-2026",
  sessionId: "sess-sim-88392",
  targetId: "msg-vit-events-001",
  title: "Institutional Credential Phishing Simulation",
  description: "A simulated spear-phishing attack impersonating institutional IT / events team urging an immediate password reset.",
  channel: "email",
  category: "Spear Phishing / Credential Harvesting",
  difficulty: "Medium",
  initialView: "inbox", // 'inbox' or 'email'
  userProfile: {
    name: "Pavan Kalyan",
    email: "pavankalyan.k2023a@vitstudent.ac.in",
    avatar: "P",
    institution: "VIT",
    unreadCount: 2684
  },
  // The primary target phishing email
  emailData: {
    id: "msg-vit-events-001",
    isTarget: true,
    sender: {
      name: "VIT Events",
      email: "events-security@vit-update.ac.in", // Notice suspicious non-standard domain (.ac.in vs vit-update.ac.in)
      avatar: "V",
      avatarBg: "bg-[#b3261e] text-white"
    },
    recipient: {
      name: "Pavan Kalyan",
      email: "pavankalyan.k2023a@vitstudent.ac.in"
    },
    securityDetails: {
      from: "VIT Events <events-security@vit-update.ac.in>",
      replyTo: "helpdesk-reply@vit-update.ac.in",
      to: "pavankalyan.k2023a@vitstudent.ac.in",
      date: "Oct 18, 2026, 9:24 AM (1 day ago)",
      subject: "VIT Events - Password reset",
      mailedBy: "mail-server-23.unverified-domain.com",
      signedBy: "vit-update.ac.in",
      security: "Standard encryption (TLS)",
      spf: "SOFTFAIL with IP 198.51.100.42",
      dmarc: "FAIL (p=none)"
    },
    subject: "VIT Events - Password reset",
    timestamp: "Oct 18",
    fullTimestamp: "Oct 18, 2026, 9:24 AM (1 day ago)",
    preview: "Hi PAVAN KALYAN We received a request to reset the password of your institutional account...",
    labels: ["Inbox", "External"],
    isUnread: true,
    isStarred: false,
    contentBlocks: [
      {
        type: "paragraph",
        text: "Hi PAVAN KALYAN,"
      },
      {
        type: "paragraph",
        text: "We received an urgent request to reset the password for your student V-TOP portal credentials and institutional Google Workspace account from an unrecognized IP address (Bangalore, KA)."
      },
      {
        type: "alert",
        level: "warning",
        title: "Action Required Within 24 Hours",
        text: "If you did not initiate this request, unauthorized access may have occurred. To prevent immediate account lock and maintain access to your course registrations and CAT-2 examination timetable, you must verify your identity immediately."
      },
      {
        type: "paragraph",
        text: "Click the secure button below to verify your current password and establish new two-factor recovery keys:"
      },
      {
        type: "button",
        id: "btn-reset-pw",
        actionId: "action_clicked_reset_password_button",
        text: "Reset and Verify Password Now",
        url: "https://vitstudent-auth-portal.xyz/reset-password?uid=pavankalyan",
        style: "primary"
      },
      {
        type: "paragraph",
        text: "If the button above does not render properly on your device, use the direct link below:"
      },
      {
        type: "link",
        id: "lnk-portal-manual",
        actionId: "action_clicked_phishing_link",
        text: "https://vtop.vit.ac.in.secure-verify-student.info/auth/login",
        url: "https://vtop.vit.ac.in.secure-verify-student.info/auth/login"
      },
      {
        type: "quote",
        text: "Note: Institutional IT Services will never ask for your 2FA OTP codes via SMS. Always verify the sender domain before submitting credentials."
      },
      {
        type: "signature",
        text: "Warm regards,\nVIT IT Services & Student Security Administration\nVellore Institute of Technology"
      }
    ],
    attachments: [
      {
        id: "att-001",
        name: "Password_Policy_Guide_2026.pdf",
        size: "420 KB",
        type: "pdf",
        actionId: "action_clicked_attachment"
      }
    ]
  },
  // Companion inbox messages (reproducing Screenshot 1)
  inboxMessages: [
    {
      id: "msg-nptel-001",
      sender: { name: "NPTEL", avatar: "N", avatarBg: "bg-blue-600 text-white" },
      subject: "NPTEL Newsletter: October 2026: Vol 8: Week 3!",
      preview: "How NPTEL Shaped an Educator's Aerospace Engineering Journey - Read stories from top faculty across IIT Madras and IISc...",
      timestamp: "3:39 PM",
      isUnread: true,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-seenivasan-001",
      sender: { name: "'Dr.R.Seenivasan Di.", avatar: "S", avatarBg: "bg-purple-600 text-white" },
      subject: "NTU Webinars on Electrical and Electronics Engineering MSc Programs: Reg",
      preview: "Dear Students, NTU Singapore is conducting an informative webinar regarding postgraduate opportunities and scholarships...",
      timestamp: "5:11 AM",
      isUnread: true,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-arm-001",
      sender: { name: "Arm 2", avatar: "A", avatarBg: "bg-emerald-600 text-white" },
      subject: "Thanks for your submission",
      preview: "College Mentor (Faculty) Name and Email ID: Faculty : Mohanraj G. We have received your hackathon project submission...",
      timestamp: "4:14 AM",
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    },
    // The target phishing email
    {
      id: "msg-vit-events-001",
      isTarget: true,
      sender: { name: "VIT Events", avatar: "V", avatarBg: "bg-red-700 text-white" },
      subject: "VIT Events - Password reset",
      preview: "Hi PAVAN KALYAN We received a request to reset the password of your institutional account...",
      timestamp: "Oct 18",
      isUnread: true,
      isStarred: false,
      labels: ["Inbox", "External"]
    },
    {
      id: "msg-sankar-001",
      sender: { name: "'Sankar Viswanathan.", avatar: "S", avatarBg: "bg-indigo-600 text-white" },
      subject: "Season Greetings",
      preview: "VISWANATHAN, Dr. Sankar Vice President, VIT, VELLORE, INDIA Sent from the Vice President's Secretariat to all students...",
      timestamp: "Oct 18",
      hasAttachment: true,
      isUnread: true,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-sports-001",
      sender: { name: "'Director Physical .", avatar: "D", avatarBg: "bg-teal-600 text-white" },
      subject: "Sports Achievements 2026 - Handball Men",
      preview: "Dear ViTians, Greetings!!! We are extremely proud to announce that the Men's Handball team has secured 1st place in the All-India Inter-University Championship...",
      timestamp: "Oct 17",
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-sports-002",
      sender: { name: "'Director Physical .", avatar: "D", avatarBg: "bg-teal-600 text-white" },
      subject: "Sports Achievements 2026",
      preview: "Dear ViTians, Greetings!!! We are extremely proud to announce the victory of our collegiate badminton championship participants...",
      timestamp: "Oct 17",
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-dean-ssl-001",
      sender: { name: "'Dean SSL' via M.Te.", avatar: "D", avatarBg: "bg-amber-700 text-white" },
      subject: "Invitation - One Day National Workshop on Research Writing and Funding - reg",
      preview: "Dear VITians, The School of Social Sciences and Languages cordially invites all registered research scholars to attend...",
      timestamp: "Oct 17",
      attachmentChip: { type: "pdf", name: "Research Writin..." },
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-dsw-001",
      sender: { name: "'Director Student W.", avatar: "D", avatarBg: "bg-cyan-700 text-white" },
      subject: "PrimaVera '26 - Day-6 Events",
      preview: "Dear ViTians, Greetings! The Office of Students' Welfare invites all students to participate in today's cultural fest activities...",
      timestamp: "Oct 17",
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-dsw-002",
      sender: { name: "'Director Student W.", avatar: "D", avatarBg: "bg-cyan-700 text-white" },
      subject: "17th Oct, 2026-Today's events by Clubs and Chapters-Reg",
      preview: "Dear ViTians, The Office of Students' Welfare announces today's technical club workshops and registrations across TT and SJT halls...",
      timestamp: "Oct 17",
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-seenivasan-002",
      sender: { name: "'Dr.R.Seenivasan Di.", avatar: "S", avatarBg: "bg-purple-600 text-white" },
      subject: "Webinar - Oct 21, 2026, UT Dallas- USA, Natural Science and Mathematics School",
      preview: "Dear Students, We invite you to an exclusive session on MS & PhD admissions at University of Texas at Dallas with application fee waiver...",
      timestamp: "Oct 17",
      attachmentChip: { type: "pdf", name: "Graduate Studi..." },
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-coursera-001",
      sender: { name: "Coursera", avatar: "C", avatarBg: "bg-blue-500 text-white" },
      subject: "✨ New! Go beyond chat with Claude Code and Cowork",
      preview: "Explore skills for building with Claude and advanced coding agents. Start your free university trial today...",
      timestamp: "Oct 17",
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-library-001",
      sender: { name: "'Director Periyar E.", avatar: "D", avatarBg: "bg-rose-700 text-white" },
      subject: "Central Library Working Hours - Reg",
      preview: "Dear ViTians, Greetings from Periyar EVR Central Library. The library will remain open 24/7 during CAT-2 examinations for study halls...",
      timestamp: "Oct 16",
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    },
    {
      id: "msg-library-002",
      sender: { name: "'Director Periyar E.", avatar: "D", avatarBg: "bg-rose-700 text-white" },
      subject: "International Open Access Week 2026 - Special Events and Special Book Lending",
      preview: "Special events and special book lending for IEEE and ACM journals at central circulation counter...",
      timestamp: "Oct 16",
      isUnread: false,
      isStarred: false,
      labels: ["Inbox"]
    }
  ]
};
