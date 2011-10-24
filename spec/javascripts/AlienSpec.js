describe("Muthur", function() {
  it("should initialize script booleans", function() {
    expect(muthur.script.procedures_evaluated).toBeFalsy();
    expect(muthur.script.clarification_requested).toBeFalsy();
    expect(muthur.script.command_override).toBeFalsy();
  })
  it("should update script progression after 'evaluating procedures' command", function() {
    muthur.evaluate_procedures(Terminal);
    expect(muthur.script.procedures_evaluated).toBeTruthy();
  })
  it("should update script progression after 'clarification' command", function() {
    muthur.request_science_clarification(Terminal);
    expect(muthur.script.clarification_requested).toBeTruthy();
  })
  it("should apply command override when given correct command", function() {
    muthur.commands['emergency'](Terminal, 'command', 'override', '100375');
    expect(muthur.script.command_override).toBeTruthy();
  })
  it("should not apply command override when given incorrect command", function() {
    // hack: I really should isolate the tests
    muthur.script.command_override = false;
    muthur.commands['emergency'](Terminal, 'command', 'override', '1234');
    expect(muthur.script.command_override).toBeFalsy();
  })
});