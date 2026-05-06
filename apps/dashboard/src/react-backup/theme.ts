/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { createTheme } from '@mui/material/styles'

const glassSx = {
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  borderRadius: "18px",
  background: "linear-gradient(180deg, rgba(4,14,24,0.96) 0%, rgba(3,12,22,0.985) 100%)",
  border: "1px solid rgba(96,190,255,0.20)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.105),
    inset 1px 0 0 rgba(120,210,255,0.055),
    inset -1px 0 0 rgba(20,80,120,0.10),
    inset 0 -1px 0 rgba(0,0,0,0.72),
    0 18px 44px rgba(0,0,0,0.52),
    0 0 34px rgba(24,150,255,0.075)
  `,
  backdropFilter: "blur(22px) saturate(145%)",
  "::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    zIndex: -1,
    pointerEvents: "none",
    background: `
      radial-gradient(circle at 18% 0%, rgba(105,210,255,0.16), transparent 34%),
      radial-gradient(circle at 92% 8%, rgba(30,140,255,0.10), transparent 28%),
      linear-gradient(135deg, rgba(145,220,255,0.105) 0%, rgba(80,170,230,0.035) 21%, rgba(255,255,255,0.012) 48%, rgba(0,0,0,0.16) 100%)
    `,
    opacity: 0.92,
  },
  "::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    borderRadius: "inherit",
    background: `
      linear-gradient(180deg, rgba(255,255,255,0.13) 0, rgba(255,255,255,0.035) 1px, transparent 38px),
      linear-gradient(115deg, transparent 0%, transparent 22%, rgba(160,225,255,0.055) 34%, rgba(160,225,255,0.015) 41%, transparent 54%, transparent 100%),
      linear-gradient(90deg, rgba(80,190,255,0.09), transparent 18%, transparent 82%, rgba(80,190,255,0.055))
    `,
    boxShadow: "inset 0 0 0 1px rgba(180,230,255,0.035), inset 0 0 28px rgba(60,170,255,0.045)",
  },
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#02070d',
      paper: '#02070d',
    },
    primary: {
      main: '#28bfff',
    },
    secondary: {
      main: '#91a8b8',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          ...glassSx,
          elevation: 0,
        } as any,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          ...glassSx,
          elevation: 0,
        } as any,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '12px',
        },
      },
    },
  },
})
