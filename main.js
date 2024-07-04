require('dotenv').config()
const WebsocketAPI = require('./src/websocketAPI')
const { Console } = require('console')

const logger = new Console({ stdout: process.stdout, stderr: process.stderr })

const Spot = require("./src/spot");
const apiKey = process.env.API_KEY
const apiSecret = process.env.API_SECRET

const client = new Spot(apiKey, apiSecret, {
  baseURL: "https://api.binance.com",
});

const upper_price = 60000;
const lower_price = 58000;
const price_gap = 100;
const unit_amount = 0.002;

let buy_order = [];
let sell_order = [];

let order_id = 1;

const callbacks = {
  open: (client) => {
    logger.debug('Connected with Websocket server')
    client.openOrders('BTCFDUSD')
  },
  close: () => logger.debug('Disconnected with Websocket server'),
  message: data => logger.info(data)
}

const websocketAPIClient = new WebsocketAPI(apiKey, apiSecret, { logger, callbacks, wsURL })
// disconnect after 20 seconds
setTimeout(() => websocketAPIClient.disconnect(), 20000)



async function main() {
  const response = await client.klines("BTCFDUSD", "1m", { limit: 1 });

  const now_price = response.data[0][4];
  console.log("now_price", now_price);
  await make_orders(now_price);
  console.log("Done");
  console.log(buy_order);
  console.log(sell_order);

  const online_orders = [...buy_order.slice(3), ...sell_order.slice(2)];
  await maintain_orders(online_orders)
}
async function maintain_orders(online_orders) {
  let ready_sell = [];
  let ready_buy = [];

  // 检查挂买单
  for (let i = 0; i < buy_order.length; i++) {
    let isExisted = false;
    for (let j = 0; j < online_orders.length; j++) {
      // 订单仍在挂单中
      if (buy_order[i].id === online_orders[j].id) {
        isExisted = true;
        break;
      }
    }

    // 订单已经被吃掉
    if (!isExisted) {
      // 挂一个对应卖单
      ready_sell.push((buy_order[i].price + price_gap));
    }
  }

  // 检查挂卖单
  for (let i = 0; i < sell_order.length; i++) {
    let isExisted = false;
    for (let j = 0; j < online_orders.length; j++) {
      // 订单仍在挂单中
      if (sell_order[i].id === online_orders[j].id) {
        isExisted = true;
        break;
      }
    }

    // 订单已经被吃掉
    if (!isExisted) {
      // 挂一个对应买单
      ready_buy.push((sell_order[i].price - price_gap));
    }
  } 
  ready_sell.reverse();
  for (let i = 0; i < ready_sell.length; i++) {
    const order = {
      id: order_id,
      price: ready_sell[i]
    }
    order_id += 1;
    sell_order.unshift(order);
  }
  for (let i = 0; i < ready_buy.length; i++) {
    const order = {
      id: order_id,
      price: ready_buy[i]
    }
    order_id += 1;
    buy_order.unshift(order);
  }
  console.log("buy_order", buy_order);
  console.log("sell_order", sell_order);
  
}

async function make_orders(now_price) {
  const start_price = Math.round(now_price / price_gap) * price_gap;
  console.log("start_price: " + start_price);

  let need_usd_amount = 0;
  for (
    let buy_price = start_price - price_gap;
    buy_price >= lower_price;
    buy_price -= price_gap
  ) {
    
    const order = {
      id: order_id,
      price: buy_price
    }
    order_id += 1;
    buy_order.push(order);
    need_usd_amount += unit_amount * buy_price;
  }
  need_usd_amount = need_usd_amount.toFixed(2);
  let need_token_amount = 0;
  for (
    let sell_price = start_price + price_gap;
    sell_price <= upper_price;
    sell_price += price_gap
  ) {
    const order = {
      id: order_id,
      price: sell_price
    }
    order_id += 1;
    sell_order.push(order);
    need_token_amount += unit_amount;
  }
  need_token_amount = need_token_amount.toFixed(2);

  const total_order_amount = buy_order.length + sell_order.length;

  console.log("need_usd_amount: " + need_usd_amount);
  console.log("need_token_amount: " + need_token_amount);

  console.log("total_order_amount: " + total_order_amount);

}

// main().then(
//   () => process.exit(),
//   (err) => {
//     console.error(err);
//     process.exit(-1);
//   }
// );
