#include <pebble.h>
#include <math.h>

#define WINDOW_WIDTH 144

static Window *window;
static TextLayer *text_layer;
static TextLayer *label_layer;
static Layer *chart_layer;
static Layer *info_layer;
static uint8_t stack[WINDOW_WIDTH];
static uint8_t stack_length = 0;
static uint8_t max_speed = 0;
static uint8_t max_height = 0;
enum {
  QUOTE_KEY_SPEED = 0x0,
};


static void handle_bluetooth(bool connected) {
  
  if (!connected) {
    text_layer_set_text(label_layer, "disconnected");
    text_layer_set_text(text_layer, "--");
  } else {
    text_layer_set_text(label_layer, "Waiting for GPS");
  }
}


 void in_received_handler(DictionaryIterator *received, void *context) {
   // incoming message received
  Tuple *speed_tuple = dict_find(received, QUOTE_KEY_SPEED);

  if (speed_tuple) {
    //app_log(APP_LOG_LEVEL_DEBUG, "speed.c", 15, speed_tuple->value->cstring);
    //text_layer_set_text(text_layer, speed_tuple->value->cstring);
    uint8_t speed = speed_tuple->value->uint8;
    text_layer_set_text(text_layer, "--");
    if (speed >= 255) {
      return;
    }

    static char str[3];
    snprintf(str, sizeof(str), "%d", speed);
    //app_log(APP_LOG_LEVEL_DEBUG, "speed.c", 15, str);
    text_layer_set_text(text_layer, str);

    if (stack_length < WINDOW_WIDTH) {
      stack_length ++;
    } else {
      for (uint8_t i = 0; i < stack_length - 1; i ++) {
        stack[i] = stack[i + 1];
      }
    }

    stack[stack_length - 1] = speed;
    layer_mark_dirty(chart_layer);
  }
 }

static GPath *s_my_path_ptr = NULL;
static GPathInfo pi;

uint8_t getY(uint8_t speed) {
  if (max_height == 0) {
    return 60;
  }

  return 60 - (60 * ((100 * speed) / max_height)) / 100;
}

void info_layer_update_proc(Layer *my_layer, GContext* ctx) {
  //
}

// .update_proc of my_layer:
void my_layer_update_proc(Layer *my_layer, GContext* ctx) {

  if (stack_length == 0) {
    return;
  }
  
  pi.num_points = stack_length + 2;
  GPoint ps[stack_length + 2];
  //*(ps + 1) = GPoint(1, 20);
  uint16_t sum_speed = 0;
  
  max_speed = 0;
  for (uint8_t i = 0; i < stack_length; i ++) {
    max_speed = max_speed < stack[i] ? stack[i] : max_speed;
    *(ps + i) = GPoint(i, getY(stack[i]));
    sum_speed += stack[i];    
    //app_log(APP_LOG_LEVEL_DEBUG, "speed.c", 15, "p");
  }

  max_height = ceil(max_speed / 10.0) * 10;

  uint8_t avg_speed = sum_speed / stack_length;
  static char str[20];
  snprintf(str, sizeof(str), "MAX.%d AVG.%d", max_speed, avg_speed);
  text_layer_set_text(label_layer, str);

  GPoint ep1 = {stack_length - 1, getY(0)};
  *(ps + stack_length) = ep1;

  GPoint ep2 = {0, getY(0)};
  *(ps + stack_length + 1) = ep2;

  //GPoint ep3 = {0, getY(stack[0])};
  //*(ps + stack_length + 2) = ep3;

  pi.points = ps;

  s_my_path_ptr = gpath_create(&pi);

  // Fill the path:
  //graphics_context_set_fill_color(ctx, GColorBlack);
  //gpath_draw_filled(ctx, s_my_path_ptr);

  //
  // Stroke the path:
  graphics_context_set_stroke_color(ctx, GColorBlack);
  gpath_draw_outline(ctx, s_my_path_ptr);

  if (stack_length < WINDOW_WIDTH) {
    uint8_t y = getY(stack[stack_length - 1]);
    y = y == 0 ? 0 : y - 1;
    graphics_context_set_stroke_color(ctx, GColorWhite);
    graphics_draw_line(ctx, GPoint(stack_length - 1,  y), GPoint(stack_length - 1,  getY(0))); 
  }

  //free(ps);
}

void in_dropped_handler(AppMessageResult reason, void *context) {
   // incoming message dropped
}

static void app_message_init(void) {
  // Register message handlers
  app_message_register_inbox_received(in_received_handler);
  app_message_register_inbox_dropped(in_dropped_handler);
  // Init buffers
  app_message_open(64, 64);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  GFont custom_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FONT_SYNCOPATE_BOLD_50));
  text_layer = text_layer_create((GRect) { .origin = { 0, 16 }, .size = { bounds.size.w, 80 } });
  text_layer_set_text(text_layer, "--");
  //text_layer_set_font(text_layer, fonts_get_system_font(FONT_KEY_BITHAM_42_BOLD));
  text_layer_set_font(text_layer, custom_font);
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));

  info_layer = layer_create((GRect) { .origin = { 0, 84 }, .size = { bounds.size.w, 20 } });
  layer_set_update_proc(info_layer, info_layer_update_proc);
  layer_add_child(window_layer, info_layer);

  label_layer = text_layer_create((GRect) { .origin = { 0, 0 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(label_layer, "Waiting for GPS");
  text_layer_set_font(label_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_text_alignment(label_layer, GTextAlignmentCenter);

  layer_add_child(info_layer, text_layer_get_layer(label_layer));
  
  chart_layer = layer_create((GRect) { .origin = { 0, 108 }, .size = { bounds.size.w, 60 } });
  layer_set_update_proc(chart_layer, my_layer_update_proc);
  layer_add_child(window_layer, chart_layer);

  bluetooth_connection_service_subscribe(&handle_bluetooth);
}

static void window_unload(Window *window) {
  
  bluetooth_connection_service_unsubscribe();

  text_layer_destroy(text_layer);
  layer_destroy(chart_layer);
  text_layer_destroy(label_layer);
  layer_destroy(info_layer);
}

static void init(void) {
  window = window_create();
  
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });

  app_message_init();
  const bool animated = true;
  window_stack_push(window, animated);

}

static void deinit(void) {
  window_destroy(window);
}

int main(void) {
  init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

  app_event_loop();
  deinit();
}
