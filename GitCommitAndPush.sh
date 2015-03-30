#!/bin/bash  
git add .  
read -p "Commit description: " desc 

current_time=$(date "+%Y.%m.%d-%H:%M:%S")

echo "Git repository updated @ $current_time"
echo [$current_time] - $desc >> updateLog.log

git commit -m "$desc" 
git push origin master
