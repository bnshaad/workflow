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
| Adaptive Learning Feedback | ✓ | ✓ | — |
| Decision Support | ✓ | ✓ | — |
| Conversational AI | ✓ | ✓ | ✓ |
| Knowledge Assistant | ✓ | ✓ | ✓ |
| Work Proof Upload | — | Review only | ✓ |
| Issue Reporting | — | Resolve only | ✓ |

---

# Notes

- Admin and Manager access the Web Management Portal.
- Employee access is through the Mobile Field Application.
- Employee mobile dashboard content is limited to Today's Jobs, Assigned Jobs, Notifications, and Quick Actions.
- Decision Support provides dashboard insights, operational recommendations, and natural-language operational queries.
- Knowledge Assistant retrieves only from SOP, User Guide, FAQ, Product Documentation, and Equipment Manuals.
- Firestore Security Rules must enforce the same role boundaries server-side.
