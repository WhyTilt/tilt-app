You are helping manage GitHub issues for the automator project. Handle the following issue command: $ARGUMENTS

Available subcommands:
- `new <description>` - Create a new GitHub issue with the given description
- `update <number> <status>` - Update issue status (ideas, todo, in-development, in-test, completed)  
- `complete <number>` - Mark issue as completed and move to "Completed" status
- `test <number> <passed|failed>` - Update test results (passed moves to "Completed", failed moves to "In Development")
- `list` - List all open issues
- `view <number>` - View specific issue details

Project constants for GraphQL queries:
- Project ID: "PVT_kwHODNICkM4A7fzF"
- Status Field ID: "PVTSSF_lAHODNICkM4A7fzFzgvxw9g"
- Status Options: Ideas="5cfb9b72", Todo="ca348567", In Development="676844ab", In Test="60f4302e", Completed="d7545599"

For creating issues:
1. Use `gh issue create` to create the issue with proper template and assign to current user with `--assignee @me`
2. Add to GitHub Project (ID: 1) using `gh project item-add 1 --url <issue-url>`
3. Set status on project board (status updates are handled automatically when adding to project)

For updating issues:
1. Use `gh issue edit` to update the issue and assign to current user with `--add-assignee @me` if not already assigned
2. Update project status using `gh project item-edit`

For completing issues:
1. Add commit summary to issue comment using `gh issue comment <number> --body "completion message"`
2. Close issue with `gh issue close <number>`
3. Move to "Completed" status on project board using GraphQL:
   ```
   gh api graphql -f query='
     mutation {
       updateProjectV2ItemFieldValue(
         input: {
           projectId: "PVT_kwHODNICkM4A7fzF"
           itemId: "<ITEM_ID>"
           fieldId: "PVTSSF_lAHODNICkM4A7fzFzgvxw9g"
           value: { singleSelectOptionId: "d7545599" }
         }
       ) {
         projectV2Item { id }
       }
     }'
   ```
   (Get ITEM_ID from project query first)

For testing issues:
1. If passed: Close issue with `gh issue close <number>`
2. If failed: Reopen issue with `gh issue reopen <number>` and add comment about failure

Always provide confirmation of actions taken and include issue numbers in responses.