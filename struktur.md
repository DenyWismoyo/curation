curation/ (Root Directory)
├── functions
│   ├── src
│   │   ├── promt
│   │   │   ├── aiConfigPrompt.ts
│   │   │   ├── formBuilderPrompt.ts
│   │   │   └── promptTemplate.ts
│   │   ├── templates
│   │   │   └── UniversalPDFDocument.tsx
│   │   ├── documentGenerator.ts
│   │   ├── emailService.ts
│   │   ├── formBuilderService.ts
│   │   ├── index.ts
│   │   ├── pdfGenerator.ts
│   │   └── vectorService.ts
│   ├── .eslintrc.js
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json
│   ├── tsconfig.dev.json
│   └── tsconfig.json
└── src
    ├── app
    │   ├── admin
    │   │   ├── assessment
    │   │   │   └── [id]
    │   │   │       └── page.tsx
    │   │   ├── templates
    │   │   │   └── page.tsx
    │   │   ├── tokens
    │   │   │   └── page.tsx
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── assessment
    │   │   ├── [trackId]
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   ├── components
    │   │   ├── admin
    │   │   │   ├── template-builder
    │   │   │   │   ├── TabAIConfig.tsx
    │   │   │   │   ├── TabFormBuilder.tsx
    │   │   │   │   ├── TabGeneral.tsx
    │   │   │   │   └── TabLogs.tsx
    │   │   │   ├── AdminAssessmentDetail.tsx
    │   │   │   ├── AdminExportPDF.tsx
    │   │   │   ├── AdminTemplatePreview.tsx
    │   │   │   ├── AdminTokenExportPDF.tsx
    │   │   │   └── TemplateExportPDFButton.tsx
    │   │   ├── curation
    │   │   │   ├── CurationDashboard.tsx
    │   │   │   ├── CurationLanding.tsx
    │   │   │   ├── DynamicField.tsx
    │   │   │   ├── DynamicTrackSelector.tsx
    │   │   │   ├── DynamicWizard.tsx
    │   │   │   ├── PublicExportPDF.tsx
    │   │   │   └── ReviewAndConfirm.tsx
    │   │   ├── curator
    │   │   │   ├── CuratorAssessmentDetail.tsx
    │   │   │   └── PDFReportTemplate.tsx
    │   │   └── shared
    │   │       ├── AIPromptBlueprintPDF.tsx
    │   │       ├── TemplateQuestionsPDF.tsx
    │   │       ├── UniversalAssessmentView.tsx
    │   │       └── UniversalPDFDocument.tsx
    │   ├── curator
    │   │   ├── assessment
    │   │   │   └── [id]
    │   │   │       └── page.tsx
    │   │   ├── dashboard
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   ├── result
    │   │   └── [id]
    │   │       └── page.tsx
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components
    │   └── ui
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dropdown-menu.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── progress.tsx
    │       ├── radio-group.tsx
    │       ├── scroll-area.tsx
    │       ├── sonner.tsx
    │       └── textarea.tsx
    ├── contexts
    │   └── AuthContext.tsx
    ├── data
    │   ├── aiPromptTemplates.tsx
    │   ├── defaultTemplates.tsx
    │   ├── documentPromptTemplates.ts
    │   ├── domainPresets.ts
    │   └── templateform.tsx
    ├── hooks
    │   ├── useCuration.ts
    │   └── usePDFExport.ts
    ├── lib
    │   ├── firebase-admin.ts
    │   ├── firebase.ts
    │   └── utils.ts
    ├── services
    │   └── ai.service.ts
    └── types
        └── curation.ts
