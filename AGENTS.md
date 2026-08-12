<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:omnifit-ui-standardization-rules -->
# Omnifit UI Standardization & Dark Mode

When developing or refactoring pages (especially for the Assessment menu or any core feature), strictly adhere to these guidelines:

1. **Use and Extend `omnifit-ui`**:
   - Always prioritize reusing components from `omnifit-ui/` or `@/components/ui`.
   - If a new generic UI component is needed, build it cleanly in the UI folder so it can be reused across the application.

2. **Consistent Dark/Light Mode Audit**:
   - Every single component and page MUST fully support both Dark and Light modes.
   - Audit color contrasts. Never hardcode colors like `bg-white` or `text-black` unless absolutely necessary. Use CSS variables via Tailwind (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, etc.).
   - Use `dark:` modifiers strategically if a specific color swap is needed that isn't handled by CSS variables.

3. **Leverage Global Custom Tailwind Classes**:
   - Do not reinvent the wheel. Utilize the custom utility classes defined in `src/app/globals.css` for consistent styling.
   - **Cards**: `.card-base`, `.card-solid`, `.card-glass`, `.card-interactive`, `.card-premium-light`, `.card-premium-dark`
   - **Buttons**: `.btn-primary-rich`, `.btn-danger-rich`, `.btn-outline-rich`
   - **Alerts**: `.alert-soft-indigo`, `.alert-soft-amber`
   - **Animations**: `.animate-float`, `.animate-soft-pulse`, `.animate-shimmer`
   - **Premium Text & Glow**: `.text-gradient-primary`, `.glass-card`, `.glow-indigo`, etc.
   - Always check `globals.css` to see if a utility class already exists before creating long inline tailwind strings.
<!-- END:omnifit-ui-standardization-rules -->
