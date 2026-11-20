// مولَّد بـ tools/ui/build-legacy-skin.js من renderer/core/modules.js (NAV_SECTIONS) — ماتعدّلش الملف باليد (DEC-0093)
export interface LegacyNavSection { id: string; label: string; pages: readonly (readonly [key: string, label: string])[] }
export const LEGACY_NAV: readonly LegacyNavSection[] = [
  {
    "id": "general",
    "label": "🧭 مركز المتابعة",
    "pages": [
      [
        "dashboard",
        "🧭 مركز المتابعة"
      ]
    ]
  },
  {
    "id": "tasks",
    "label": "مهامي",
    "pages": [
      [
        "tasks.my",
        "مهامي"
      ]
    ]
  },
  {
    "id": "hr",
    "label": "الموارد البشرية",
    "pages": [
      [
        "hrHome",
        "🏠 لوحات الموارد البشرية"
      ],
      [
        "employees",
        "الموظفين"
      ],
      [
        "supervisors",
        "المشرفون"
      ],
      [
        "workers",
        "العمال"
      ],
      [
        "drivers",
        "السائقون"
      ],
      [
        "equipment",
        "معدات ومركبات"
      ],
      [
        "attendance",
        "حضور الموظفين"
      ],
      [
        "workerAttendance",
        "اليوميات"
      ],
      [
        "leaves",
        "الإجازات"
      ],
      [
        "performance",
        "تقييم الأداء"
      ]
    ]
  },
  {
    "id": "clients",
    "label": "العملاء والمشاريع",
    "pages": [
      [
        "clients.customers",
        "العملاء"
      ],
      [
        "projects",
        "المشاريع"
      ],
      [
        "clients.workSurveys",
        "أعمال الحصر"
      ],
      [
        "clients.boqs",
        "المقايسات"
      ],
      [
        "clients.contracts",
        "العقود"
      ],
      [
        "clients.invoices",
        "المستخلصات"
      ],
      [
        "clients.guarantees",
        "الضمانات"
      ],
      [
        "clients.comparison",
        "المقارنة"
      ],
      [
        "clients.crm",
        "CRM"
      ]
    ]
  },
  {
    "id": "suppliers",
    "label": "الموردون",
    "pages": [
      [
        "ledger.suppliers",
        "الموردون"
      ],
      [
        "ledger.invoices",
        "الفواتير"
      ],
      [
        "ledger.quarterly",
        "إشعارات الخصم"
      ],
      [
        "ledger.returns",
        "المرتجعات"
      ]
    ]
  },
  {
    "id": "warehouses",
    "label": "المخازن",
    "pages": [
      [
        "warehouses.home",
        "المخازن"
      ],
      [
        "warehouses.reports",
        "تقارير المخازن"
      ]
    ]
  },
  {
    "id": "movements",
    "label": "حركة الموارد",
    "pages": [
      [
        "transfers",
        "حركة الموارد"
      ]
    ]
  },
  {
    "id": "accounts",
    "label": "الحسابات",
    "pages": [
      [
        "workerDues",
        "المستحقات"
      ],
      [
        "ledger.payments",
        "الدفعات"
      ],
      [
        "expenses",
        "مصاريف شاملة"
      ],
      [
        "costs",
        "تكاليف شاملة"
      ],
      [
        "clients.collections",
        "الإيرادات"
      ],
      [
        "clients.accounts",
        "حسابات العملاء"
      ]
    ]
  },
  {
    "id": "reports",
    "label": "التقارير",
    "pages": [
      [
        "reports",
        "تقارير الموارد البشرية"
      ],
      [
        "clients.reports",
        "تقارير العملاء والمشاريع"
      ],
      [
        "ledger.reports",
        "تقارير الموردين"
      ],
      [
        "accounts.reports",
        "تقارير الحسابات"
      ]
    ]
  },
  {
    "id": "archive",
    "label": "الأرشيف",
    "pages": [
      [
        "archive",
        "أرشيف الموارد البشرية"
      ],
      [
        "ledger.archive",
        "أرشيف الموردين"
      ],
      [
        "clients.archive",
        "أرشيف العملاء والمشاريع"
      ]
    ]
  },
  {
    "id": "settings",
    "label": "الإعدادات",
    "pages": [
      [
        "backup",
        "الإعدادات العامة"
      ],
      [
        "users",
        "المستخدمون"
      ],
      [
        "ledger.categories",
        "الاقتراحات"
      ]
    ]
  }
];
