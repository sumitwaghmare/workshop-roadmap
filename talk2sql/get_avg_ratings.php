<?php
$conn = new mysqli('acevs125', 'prj_admin', 'admin12345$', 'projex_ctg', 3306);
if ($conn->connect_error) die('Connection failed');

$sql = "
SELECT name as user_email, ROUND(AVG(self_rating), 2) as avg_rating, COUNT(*) as goals_count
FROM table_goals
WHERE self_rating > 0
GROUP BY name
ORDER BY avg_rating ASC
";

$res = $conn->query($sql);

if ($res && $res->num_rows > 0) {
    echo "Average Self-Rating per User (Lowest first):\n";
    printf("%-40s | %-12s | %-12s\n", "User Email", "Avg Rating", "Goals Count");
    echo str_repeat("-", 70) . "\n";
    while($row = $res->fetch_assoc()) {
        printf("%-40s | %-12.2f | %-12d\n", $row['user_email'], $row['avg_rating'], $row['goals_count']);
    }
} else {
    echo "No rated goals found.";
}

$conn->close();
?>
