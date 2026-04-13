type TerritoryViewData = {
  position: {
    x: number;
    y: number;
  };
};

export type ViewData = { [id: string]: TerritoryViewData };
