# =====================================================================
#  Reaffiche la barre des taches Windows (remplace show_my_taskbar.exe).
#  A lancer quand on a ferme Chrome et qu'on veut revenir a Windows normal.
# =====================================================================

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class IatemWinShow {
  [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  [DllImport("user32.dll")] public static extern int ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

foreach ($cls in @('Shell_TrayWnd', 'Shell_SecondaryTrayWnd')) {
  $h = [IatemWinShow]::FindWindow($cls, $null)
  if ($h -ne [IntPtr]::Zero) { [IatemWinShow]::ShowWindow($h, 5) | Out-Null }  # 5 = SW_SHOW
}
