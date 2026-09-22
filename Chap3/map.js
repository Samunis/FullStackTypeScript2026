const employees = [
    { name: "tim", id: 1 },
    { name: "cindy", id: 2 },
    { name: "rob", id: 3 },
];

const elements = employees.map(employee =>
    `<div>${employee.id} ${employee.name}</div>`
);

console.log(elements);