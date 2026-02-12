function getCoords(id) {
  const element = document.getElementById(id);
  if (!element) {
    return { right: 0, top: 0 };
  }
  return element.getBoundingClientRect();
}

export const successTheme = ({ x, y }) => {
  return {
    "--toastBackground": "#fff",
    "--toastColor": "--gray-dark",
    "--toastProgressBackground": "#28a745",
    "text-align": "center",
    transform: `translate(${getCoords(x).right + 15}px, ${getCoords(y).top}px)`,
  };
};

export const warningTheme = ({ x, y }) => {
  return {
    "--toastBackground": "#fff",
    "--toastColor": "--gray-dark",
    "--toastProgressBackground": "#dc3545",
    "text-align": "center",
    transform: `translate(${getCoords(x).right + 15}px, ${getCoords(y).top}px)`,
  };
};

export const infoTheme = ({ x, y }) => {
  return {
    "--toastBackground": "#fff",
    "--toastColor": "--gray-dark",
    "--toastProgressBackground": "#ffc107",
    "text-align": "center",
    transform: `translate(${getCoords(x).right + 15}px, ${getCoords(y).top}px)`,
  };
};
