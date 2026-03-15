I want to make light weight webapp, which will be deployed to Vercel (next.js) platform. create the app at the root of current folder.
the db will be on mysql on remote db. This will be used to rank/sort projects for new product and technologies in diffrent buckets by diffrent groups, and then showing them all together how the selection look, and then derive the final roadmap.
The inspiration can be taken from roadmap-draft-1.html in ref. folder. This is the roadmap, we will only show Axis with "Status".
The buckets remains same, for Y-Axis it will be "Protect", "Grow", "Expand" and "Reimagine" and on X-Axis, it will be three Horizon.

The workflow will be like this. the main page, is where admin can create list of projects with short description. the admin will also create group and name them (e.g. Group 1 : BU TCD, Group 2: BU MCD etc...). for each group, it will be same url with the parameter for group in url.
Group leader will open his link (only one link per group/user), he will see all the projects as 'Inbox', then based on group discussion, the leader will move the project to respective X/Y box. He can also add more projects, if its not in the list. This will be done by each group leader. the db will save, projects, its X/Y box and group in DB.
the admin, on his page, now can see various view, in 'Table view' he can see the list of project, and in next column, how each group has ranked it. (so column for each group, he can see same project was in Grow and in Horizon 2 by one group and other group has put same project in Expand, Horizon 1).
In "Roadmap" view, he can see the unique projects, based on common rating, and majority, the project will be shown on respective X/Y box, it will show in small bubble which group has recommedned it (e.g. G1,G5). The project, which was not picked by anyone or which has no majoirty selection by each group will be shown in Inbox. The page will self refresh in set seconds (set by admin on same page).

Once all transactions are over by the group, admin can 'kill the links', and now on main page, he can review the roadmap, show and discuss with larget group. Based on discussion in the session, he can drag/drop the projects to final position. This will be the final Roadmap.

Tech: Next.js (App Router), Prisma ORM with MySQL, Tailwind CSS + shadcn/ui, 
@dnd-kit for drag/drop. 

Auth: Simple JWT-based admin login (username/password in .env). 
Group links are public URLs — no login required, access controlled by unique token in URL.

Majority rule: A project is placed in the box chosen by >50% of groups. 
Ties go to Inbox. Group leaders can edit their own placements until links are killed.

New projects added by group leaders are immediately visible to all groups and Admin, all transaction by group leader/admin to be auto-saved .
Final roadmap state is persisted in DB as a separate snapshot on Admin save.
   