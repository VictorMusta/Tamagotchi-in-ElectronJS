const fs = require('fs');
const readline = require('readline');

async function countMatches() {
    const counts = new Map();
    const rl = readline.createInterface({
        input: fs.createReadStream('matches.csv'),
        crlfDelay: Infinity
    });

    let firstLine = true;
    for await (const line of rl) {
        if (firstLine) {
            firstLine = false;
            continue;
        }
        const [p1, p2, winner] = line.split(',');
        counts.set(p1, (counts.get(p1) || 0) + 1);
        counts.set(p2, (counts.get(p2) || 0) + 1);
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
        console.log("No matches found yet.");
        return;
    }

    const most = sorted[0];
    const least = sorted[sorted.length - 1];
    
    console.log(`Most: ${most[0]} (${most[1]} matches)`);
    console.log(`Least: ${least[0]} (${least[1]} matches)`);
    console.log(`Difference: ${most[1] - least[1]}`);
}

countMatches();
