@echo off
echo Starting Flask...
start "Flask" cmd /k "cd /d C:\Users\gideo\OneDrive\Documentos\ARCHITEXT && python app.py"

echo Starting Spring Boot...
start "Spring Boot" cmd /k "cd /d C:\Users\gideo\OneDrive\Documentos\ARCHITEXT\architext-backend && mvn spring-boot:run"

echo Starting Expo...
start "Expo" cmd /k "cd /d C:\Users\gideo\OneDrive\Documentos\ARCHITEXT\architext-app && npx expo start --tunnel"

echo All servers starting in separate windows!