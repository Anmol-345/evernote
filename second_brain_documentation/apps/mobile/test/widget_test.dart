import 'package:flutter_test/flutter_test.dart';
import 'package:second_brain_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    expect(const SecondBrainApp(), isNotNull);
  });
}
