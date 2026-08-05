import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { DataTable, type DataTableColumn } from "@/components/DataTable";

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [{ key: "name", header: "Name", render: (r) => r.name }];

describe("DataTable", () => {
  it("renders rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Alpha" }]}
        getRowId={(r) => r.id}
        caption="Test table"
        emptyTitle="Nothing"
        emptyDescription="Nothing to show"
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });

  it("renders EmptyState when there are no rows", () => {
    render(
      <DataTable columns={columns} rows={[]} getRowId={(r) => r.id} caption="Test table" emptyTitle="No rows" emptyDescription="Add one" />
    );
    expect(screen.getByText("No rows")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("has no accessibility violations with data", async () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Alpha" }]}
        getRowId={(r) => r.id}
        caption="Test table"
        emptyTitle="Nothing"
        emptyDescription="Nothing to show"
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
