import 'dotenv/config'

import { execSync } from 'child_process'
import axios from 'axios'
import json2md from 'json2md'
import fs from 'fs'
import dayjs from 'dayjs'

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

async function getContributorsByRepository(owner: string, repo: string) {
    try {
        const headers = await authenticate();
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contributors`, { headers });
        const contributors = response.data.map((contributor: { login: string, contributions: number }) => ({
          login: contributor.login, 
          contributions: contributor.contributions
        })).sort((a: { contributions: number }, b: { contributions: number }) => b.contributions - a.contributions).slice(0, 5);
        return [repo, contributors];
    } catch (error: any) {
        console.error('Error fetching contributors:', error.response.data);
        throw error;
    }
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
        const contributors = await Promise.all(repositories.map(async (repo: string) => {
            return await getContributorsByRepository(owner, repo);
        }));

        const table = repositories.filter((name: string) => name !== '.github').map((name: string) => {
          return [name]
        });

        
        const contributorTable = contributors.map(([repoName, repoContributors]: [string, { login: string, contributions: number }[]]) => {
          return [
            { h2: repoName },
            { table: {
                headers: ['Contributor', 'Count'],
                rows: repoContributors.map(({ login, contributions }: { login: string, contributions: number }) => [login, contributions])
            } }
          ]
        });

        const currentDateTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

        const readmeContent = json2md([
            { h1: 'GitHub Repo Activity Tracker' },
            { p: 'This project uses the GitHub API to track activity metrics across multiple repositories within a single organisation.' },
            { h2: 'Features' },
            { 
              ul: [
                [
                  '**Track Contributors**  Identify the most active contributors across repos', 
                  '**Commit Count:** Enumerate the total number of commits for each repository.',
                  '**Pull Request Status:** Analyse the volume and status (open/closed) of pull requests within each repository.'
                ],
              ] 
            },
            { h2: 'Installation' },
            { p: '...' },
            { h2: 'Output' },
            { p: 'A list of repositories within the organisation:' },
            ...contributorTable,
            { p: `Last modified: ${currentDateTime}` }
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