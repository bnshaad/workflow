# Platform Access Matrix

Version: 1.1
Status: Approved
Last Updated: July 2026

---

| Feature | Admin (Web) | Manager (Web) | Employee (Mobile) |
|---------|:-----------:|:-------------:|:-----------------:|
| Authentication | ✓ | ✓ | ✓ |
| User Profile | ✓ | ✓ | Own profile |
| Dashboard | ✓ | ✓ | Today's Jobs only |
| Jobs | ✓ | ✓ | Assigned Jobs only |
| Team | ✓ | ✓ | — |
| Settings | ✓ | Limited | — |
| Audit Logs | ✓ | — | — |
| Notifications | ✓ | ✓ | ✓ |
| AI Job Understanding | ✓ | ✓ | — |
| Intelligent Task Assignment | ✓ | ✓ | Assigned outcome only |
| Explainable AI | ✓ | ✓ | Assigned-job context only |
| Manager Recommendation Feedback | ✓ | ✓ | — |
| AI-Assisted Assignment Evaluation | ✓ | ✓ | — |
| Decision Support Alerts | ✓ | ✓ | — |
| Controlled Conversational Workflow Assistant | ✓ | ✓ | — |
| Grounded Knowledge Assistant | ✓ | ✓ | ✓ |
| Work Proof Upload | — | Review only | ✓ |
| Issue Reporting | — | Resolve only | ✓ |

---

# Notes

- Admin and Manager access the Web Management Portal.
- Employee access is through the Mobile Field Application.
- Employee mobile dashboard content is limited to Today's Jobs, Assigned Jobs, Notifications, and Quick Actions.
- Decision Support Alerts provide limited Action Needed dashboard alerts.
- Grounded Knowledge Assistant retrieves only from trusted approved sources and must cite or show source references.
- Firestore Security Rules must enforce the same role boundaries server-side.
