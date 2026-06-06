// marketStatusWorker.js

const axios = require("axios");
const globalStore = require("./globalStore");

const MAX_FAILURES = 10;
const POLL_INTERVAL = 30000; // 30 sec

let timer = null;

async function pollMarketStatus() {

  try {

    console.log("Fetching market status...");

    const response = await axios.get(
      "https://onedinaarvirtualaccount.onrender.com/api/stockbrowserold/marketstatus",
      {
        timeout: 10000
      }
    );

    if (Array.isArray(response.data)  ) {

      globalStore.marketStatus = response.data;
      globalStore.lastUpdated = new Date();
      globalStore.failCount = 0;

      console.log(
        `Cached ${response.data.length} indices`
      );

    }
    if(response.data !==undefined){
      globalStore.tableLiveIndices = response.data;
      globalStore.lastUpdated = new Date();
      globalStore.failCount = 0;

      console.log(
        `Cached  table live indices html indices`
      );

      clearInterval(timer);
    }

  } catch (err) {

    globalStore.failCount++;

    console.error(
      `Market Status Poll Failed (${globalStore.failCount})`,
      err.message
    );

    if (globalStore.failCount >= MAX_FAILURES) {

      console.error(
        "Maximum failures reached. Poller stopped."
      );

      clearInterval(timer);
      timer = null;
    }
  }
}

function startMarketPoller() {

  pollMarketStatus();

  timer = setInterval(
    pollMarketStatus,
    POLL_INTERVAL
  );

  console.log("Market Poller Started");
}

module.exports = {
  startMarketPoller
};
