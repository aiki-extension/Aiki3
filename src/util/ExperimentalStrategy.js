class ExperimentalStrategy {
  async handleNavigation() {
    return false; // let existing experimental flow run
  }
}

export default ExperimentalStrategy;
