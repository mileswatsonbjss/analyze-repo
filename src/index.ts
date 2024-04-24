import 'dotenv/config'

import { execSync } from 'child_process'
import axios from 'axios'
import json2md from 'json2md'
import fs from 'fs'

// Define owner
const owner = 'facebook';

// Function to authenticate with GitHub
async function authenticate() {
    const accessToken = process.env.ACCESS_TOKEN || '';
    const headers = {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
    };
    return headers;
}

// Function to get all repositories of an owner
async function getAllRepositories(owner: string) {
    try {
        const headers = await authenticate();
        const response = await axios.get(`https://api.github.com/users/${owner}/repos`, { headers });
        const repositories = response.data.map((repo: { name: string }) => repo.name);
        return repositories;
    } catch (error: any) {
        console.error('Error fetching repositories:', error.response.data);
        throw error;
    }
}

(async () => {
    try {
        const repositories = await getAllRepositories(owner);

        const table = repositories.filter((name: string) => name !== '.github').map((name: string) => {
          return [name]
        });

        const readmeContent = json2md([
            { h1: 'Analyze repo' },
            { table: {
                headers: ['Repository'],
                rows: table
            }}
        ]);

        fs.writeFileSync('README.md', readmeContent);

    } catch (error) {
        console.error('An error occurred:', error);
    }
    
    try {
        // Add changes
        execSync('git add .');
    
        // Commit changes
        execSync('git commit -m "Update README.md"');
    
        // Push changes
        execSync('git push origin main');
    
        console.log('Changes added, committed, and pushed successfully.');
    } catch (error) {
        console.error('Error occurred whilst pushing untracked files:', error);
    }
})();