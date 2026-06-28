# Project Rules and Local Environment Configuration

## Local Tooling and SDK Status
- **Google Cloud SDK**: Already installed and authenticated on the local host machine.
  - **Status**: Installed & Active
  - **Authentication**: User is authenticated with gcloud CLI.
  - **Executable Paths**: If the `gcloud` command is not found in the current terminal session's `PATH` (due to path caching), it is located at:
    `C:\Users\ASUS\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin`
  - **Path Refresh Command**: To refresh PATH in the current PowerShell terminal session and execute gcloud/bq commands:
    `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`

## Codebase Architecture & UI Layout Rules

To ensure visual integrity and prevent regressions in UI elements:
1. **Vertical DOM Layout Hierarchy & Order:**
   - Inside the main Walkie-Talkie Faceplate container, components must strictly follow this order:
     1. LCD Display Panel (`RadioLCD`)
     2. Visualizer Progress Bar (`ProgressBar`)
     3. D-Pad Control Buttons (`RadioFooter` / `ControlButtons`)
   - The Quick Action Dock (`RadioQuickDock`) must be rendered inside the body wrapper container (only visible when the User List Modal is open).
   - Any refactoring must preserve this visual order by utilizing React slots/props (`lcd`, `footer`, `quickDock`, `karaokePlayer`) passed into the main `RadioBody` container, rather than rearranging them in the render tree.

2. **Component Separation Rules:**
   - Expose no global stores on `window` (use normal imports).
   - Maintain the separation of stores, hooks, services, and UI components as refactored during Sprint 2.
