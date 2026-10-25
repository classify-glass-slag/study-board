Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = scriptPath

If sh.AppActivate("StudyBoard") Then
    MsgBox "Board is running~"
    WScript.Quit
End If

Set exec = sh.Exec("cmd /c netstat -ano | findstr :3099 | findstr LISTENING")
outText = exec.StdOut.ReadAll()

If InStr(outText, "3099") > 0 Then
	isRunning = True
Else
	isRunning = False
End If

If isRunning = False Then
	sh.Run "cmd /c start """" /min node server.js", 0, False
	WScript.Sleep 2000
End If

edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
profilePath = scriptPath & "\.edge-profile"

sh.Run """" & edgePath & """ --app=http://127.0.0.1:3099 --user-data-dir=""" & profilePath & """", 0, False

If isRunning = True Then detectText = "running" Else detectText = "stopped"
If isRunning = False Then startText = "yes" Else startText = "no"

logFile = scriptPath & "\.launcher.log"
Set logStream = fso.OpenTextFile(logFile, 8, True)
logStream.WriteLine Now & " | detect=" & detectText & " | start=" & startText
logStream.Close