import '../models/create_event_input.dart';
import '../models/delete_result.dart';
import '../models/schedule_event.dart';
import 'api_client.dart';

abstract class PlannerRepository {
  Future<List<ScheduleEvent>> eventsForDay(DateTime day);

  Future<ScheduleEvent> createEvent(CreateEventInput input);

  Future<ScheduleEvent> completeEvent(int id);

  Future<DeleteResult> deleteEvent(int id);
}

class ApiPlannerRepository implements PlannerRepository {
  ApiPlannerRepository(this._client);

  final ApiClient _client;

  @override
  Future<List<ScheduleEvent>> eventsForDay(DateTime day) {
    return _client.eventsForDay(day);
  }

  @override
  Future<ScheduleEvent> createEvent(CreateEventInput input) {
    return _client.createEvent(input);
  }

  @override
  Future<ScheduleEvent> completeEvent(int id) {
    return _client.completeEvent(id);
  }

  @override
  Future<DeleteResult> deleteEvent(int id) {
    return _client.deleteEvent(id);
  }
}
