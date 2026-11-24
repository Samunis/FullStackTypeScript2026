SELECT
u.id AS "authorId",
u.username,
COUNT(p.id)::int AS "totalPosts",
COALESCE(SUM(p.views), 0)::int AS "totalViews"
FROM "User" u
LEFT JOIN "Post" p ON u.id = p."authorId"
GROUP BY u.id, u.username
ORDER BY "totalViews" DESC;