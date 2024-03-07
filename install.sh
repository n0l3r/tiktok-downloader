while IFS= read -r line
	do
		sudo apt-get install -y "$line"
	done < deps.txt
